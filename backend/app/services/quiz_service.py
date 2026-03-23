"""
services/quiz_service.py

Quiz generation pipeline:
  1. Load document chunks from Postgres
  2. Get top extracted concepts (spaCy/TextRank/TF-IDF) from Postgres
  3. Build a structured Mistral prompt requesting JSON output
  4. Call Mistral LLM (with retries)
  5. Parse and structurally validate JSON response
  6. LLM re-check: ask Mistral to verify each answer is correct
  7. Deduplicate questions (normalized text fingerprint)
  8. Persist Quiz + Questions + Answers to Postgres
  9. Update QuizJob status (completed / failed)

Cost monitoring: total tokens logged and stored on QuizJob.
"""
from __future__ import annotations

import json
import re
import uuid
from typing import Any

from app.celery_app import celery
from app.core.config import settings
from app.core.logging import logger

# ── Difficulty prompts ────────────────────────────────────────────────────────

_DIFFICULTY_INSTRUCTIONS: dict[str, str] = {
    "easy": (
        "Questions should test basic recall and recognition of key facts and definitions. "
        "Use simple, direct language. Distractors (wrong answers) should be clearly incorrect."
    ),
    "medium": (
        "Questions should require understanding and application of concepts. "
        "Include some interpretation and inference. Distractors should be plausible but wrong."
    ),
    "hard": (
        "Questions should require analysis, synthesis, and critical thinking. "
        "Test nuanced understanding and edge cases. Distractors should be very plausible. "
        "Avoid trivial questions."
    ),
}

# ── Prompt templates ──────────────────────────────────────────────────────────

_GENERATION_SYSTEM = """\
You are an expert educator creating a quiz from a document.
Your task is to generate high-quality quiz questions that accurately test knowledge
of the document content. Be precise and ensure all answers are factually correct
based solely on the provided document excerpts.
"""

_GENERATION_PROMPT = """\
## Document Excerpts
<context>
{context}
</context>

## Key Concepts
{concepts}

## Task
Generate exactly {num_questions} quiz questions at **{difficulty}** difficulty.

{difficulty_instructions}

Mix MCQ (multiple choice, 4 options, exactly 1 correct) and TrueFalse questions.
- For MCQ: provide exactly 4 answer options with exactly one marked correct.
- For TrueFalse: provide exactly 2 options ("True" / "False") with exactly one marked correct.

Rules:
- Questions must be based solely on the document content above.
- Do not repeat the same question with different wording.
- Each question must have exactly one correct answer.
- Questions must be clear and unambiguous.

Output ONLY valid JSON with no extra text, markdown, or explanation:
{{
  "questions": [
    {{
      "type": "MCQ",
      "text": "Question text?",
      "answers": [
        {{"text": "Correct answer", "is_correct": true}},
        {{"text": "Wrong answer B", "is_correct": false}},
        {{"text": "Wrong answer C", "is_correct": false}},
        {{"text": "Wrong answer D", "is_correct": false}}
      ]
    }},
    {{
      "type": "TrueFalse",
      "text": "A statement about the document.",
      "answers": [
        {{"text": "True", "is_correct": true}},
        {{"text": "False", "is_correct": false}}
      ]
    }}
  ]
}}
"""

_RECHECK_PROMPT = """\
You are a fact-checker reviewing quiz questions generated from a document.

## Document Excerpts
<context>
{context}
</context>

## Questions to Verify
{questions_json}

## Task
For each question, verify whether the marked correct answer is actually correct
based ONLY on the document content above.

Output ONLY valid JSON:
{{
  "results": [
    {{"index": 0, "valid": true}},
    {{"index": 1, "valid": false, "reason": "brief reason why it is wrong"}}
  ]
}}
"""


# ── LLM helper ────────────────────────────────────────────────────────────────

def _call_llm_json(prompt: str, temperature: float = 0.3) -> tuple[str, int, int, int]:
    """Thin wrapper: prepend system instructions and delegate to llm_service.
    json_mode=True enables native JSON output mode (Gemini: response_mime_type),
    eliminating markdown-fence parse failures.
    """
    from app.services.llm_service import call_llm
    return call_llm(
        _GENERATION_SYSTEM + "\n\n" + prompt,
        temperature=temperature,
        max_tokens=4096,
        json_mode=True,
    )


# ── JSON extraction ───────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """
    Extract JSON from Mistral response, stripping markdown code fences if present.
    """
    # Strip markdown fences
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


# ── Structural validation ─────────────────────────────────────────────────────

_VALID_TYPES = {"MCQ", "TrueFalse"}


def _validate_question(q: dict) -> bool:
    """
    Return True if a question dict has the required structure:
    - type is MCQ or TrueFalse
    - MCQ: exactly 4 answers, exactly 1 correct
    - TrueFalse: exactly 2 answers, exactly 1 correct, texts are "True"/"False"
    """
    q_type = q.get("type")
    if q_type not in _VALID_TYPES:
        return False
    if not q.get("text", "").strip():
        return False

    answers = q.get("answers", [])
    correct_count = sum(1 for a in answers if a.get("is_correct") is True)

    if correct_count != 1:
        return False

    if q_type == "MCQ":
        return len(answers) == 4
    else:  # TrueFalse
        if len(answers) != 2:
            return False
        texts = {a.get("text", "").strip() for a in answers}
        return texts == {"True", "False"}


# ── Deduplication ─────────────────────────────────────────────────────────────

def _fingerprint(text: str) -> str:
    """Normalize question text for deduplication."""
    return re.sub(r"\W+", "", text.lower())


def _deduplicate(questions: list[dict]) -> list[dict]:
    """Remove questions with duplicate fingerprints, keeping first occurrence."""
    seen: set[str] = set()
    unique: list[dict] = []
    for q in questions:
        fp = _fingerprint(q.get("text", ""))
        if fp and fp not in seen:
            seen.add(fp)
            unique.append(q)
    return unique


# ── LLM re-check ─────────────────────────────────────────────────────────────

def _recheck_answers(
    questions: list[dict],
    context: str,
) -> list[dict]:
    """
    Ask Mistral to verify each answer is correct.
    Returns only the questions that pass validation.
    """
    if not questions:
        return questions

    questions_json = json.dumps(
        [{"index": i, "type": q["type"], "text": q["text"], "answers": q["answers"]}
         for i, q in enumerate(questions)],
        indent=2,
    )
    prompt = _RECHECK_PROMPT.format(
        context=context,
        questions_json=questions_json,
    )

    try:
        raw, pt, ct, tt = _call_llm_json(prompt, temperature=0.1)
        data = _extract_json(raw)
        results = data.get("results", [])
        valid_indices = {r["index"] for r in results if r.get("valid") is True}
        invalid = [r for r in results if not r.get("valid")]
        for r in invalid:
            logger.info(
                "Quiz re-check: question %d rejected — %s",
                r["index"],
                r.get("reason", "no reason"),
            )
        logger.info(
            "Quiz re-check: %d/%d questions passed (tokens: %d)",
            len(valid_indices), len(questions), tt,
        )
        return [q for i, q in enumerate(questions) if i in valid_indices]
    except Exception as exc:
        # Re-check failure is non-fatal: log and return all questions
        logger.warning("Quiz re-check failed (non-fatal): %s", exc)
        return questions


# ── Pure correction logic (unit-testable, no DB dependency) ──────────────────

def _compute_correction(
    student_answers: list,
    correct_text: dict[int, str],
    question_points: dict[int, int],
) -> tuple[list, float | None]:
    """
    Grade a list of student answers.

    Args:
        student_answers: ORM StudentAnswer objects (or any object with
                         .question_id, .answer_text, .is_correct attributes).
        correct_text:    {question_id: correct_answer_text_lowered} — only
                         contains auto-correctable (MCQ/TrueFalse) questions.
        question_points: {question_id: points} for auto-correctable questions.

    Returns:
        (student_answers, score_or_None)
        - student_answers have .is_correct mutated in place.
        - score is the weighted percentage (0–100) over auto-correctable
          questions, or None when there are none (all ShortAnswer).
    """
    auto_correctable = set(correct_text.keys())
    earned_points = 0
    total_points = sum(question_points.get(qid, 1) for qid in auto_correctable)

    for sa in student_answers:
        if sa.question_id in auto_correctable:
            submitted = (sa.answer_text or "").strip().casefold()
            sa.is_correct = submitted == correct_text[sa.question_id]
            if sa.is_correct:
                earned_points += question_points.get(sa.question_id, 1)
        # ShortAnswer: is_correct stays None (manual grading)

    if not auto_correctable:
        return student_answers, None

    score = round(earned_points / total_points * 100, 2)
    return student_answers, score


# ── DB persistence ────────────────────────────────────────────────────────────

def _persist_quiz(
    *,
    db,
    document_id: int,
    class_id: str | None,
    title: str,
    difficulty: str,
    questions: list[dict],
) -> int:
    """
    Create Quiz + Questions + Answers in DB. Returns quiz.id.
    """
    from app.models.answer import Answer
    from app.models.question import Question, QuestionType
    from app.models.quiz import Quiz, QuizStatus

    quiz = Quiz(
        class_id=class_id,
        document_id=document_id,
        title=title,
        difficulty=difficulty,
        status=QuizStatus.draft,
    )
    db.add(quiz)
    db.flush()  # get quiz.id

    for order, q_data in enumerate(questions, start=1):
        q_type = (
            QuestionType.mcq
            if q_data["type"] == "MCQ"
            else QuestionType.true_false
        )
        question = Question(
            quiz_id=quiz.id,
            type=q_type,
            text=q_data["text"].strip(),
            order=order,
            points=int(q_data.get("points", 1)),
        )
        db.add(question)
        db.flush()  # get question.id

        for ans_order, a_data in enumerate(q_data["answers"], start=1):
            answer = Answer(
                question_id=question.id,
                text=a_data["text"].strip(),
                is_correct=bool(a_data["is_correct"]),
                order=ans_order,
            )
            db.add(answer)

    db.commit()
    logger.info(
        "Quiz persisted: quiz_id=%d document_id=%d questions=%d",
        quiz.id, document_id, len(questions),
    )
    return quiz.id


# ── Celery task ───────────────────────────────────────────────────────────────

@celery.task(
    name="app.services.quiz_service.generate_quiz_task",
    bind=True,
    max_retries=1,
    default_retry_delay=30,
)
def generate_quiz_task(
    self,
    job_id: str,
    document_id: int,
    num_questions: int,
    difficulty: str,
    db_url: str,
) -> dict:
    """
    Celery task: generate a quiz from a document using Mistral.

    Steps:
      1. Load document chunks from Postgres
      2. Get top concepts from Postgres
      3. Generate questions via Mistral
      4. Parse + structurally validate
      5. LLM re-check answers
      6. Deduplicate
      7. Persist quiz to DB
      8. Update QuizJob status

    Args:
        job_id:        UUID string of the QuizJob row.
        document_id:   PK of the Document.
        num_questions: Target question count (5–50).
        difficulty:    "easy" | "medium" | "hard".
        db_url:        SQLAlchemy database URL.
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker

    from app.models.document import Document
    from app.models.document_chunk import DocumentChunk
    from app.models.document_concept import DocumentConcept
    from app.models.quiz_job import JobStatus, QuizJob

    engine = create_engine(str(db_url))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    logger.info(
        "[Quiz] Starting generate_quiz_task: job=%s doc=%d n=%d diff=%s",
        job_id, document_id, num_questions, difficulty,
    )

    try:
        # ── Mark job as processing ────────────────────────────────────────────
        job = db.scalar(select(QuizJob).where(QuizJob.id == uuid.UUID(job_id)))
        if job is None:
            logger.error("[Quiz] Job %s not found", job_id)
            return {"error": "job not found"}

        job.status = JobStatus.processing
        db.commit()

        # ── Step 1: Load document ─────────────────────────────────────────────
        doc = db.scalar(select(Document).where(Document.id == document_id))
        if doc is None:
            raise ValueError(f"Document {document_id} not found")

        class_id_str: str | None = str(doc.class_id) if doc.class_id else None

        # ── Step 2: Load chunks ───────────────────────────────────────────────
        chunks = db.scalars(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        ).all()

        if not chunks:
            raise ValueError(f"Document {document_id} has no chunks — is it processed?")

        # Build context: use up to 12 000 chars (same as RAG pipeline)
        context_parts: list[str] = []
        total_chars = 0
        for chunk in chunks:
            text = chunk.chunk_text.strip()
            if total_chars + len(text) > 12000:
                remaining = 12000 - total_chars
                if remaining > 200:
                    context_parts.append(text[:remaining] + "…")
                break
            context_parts.append(text)
            total_chars += len(text)

        context = "\n\n---\n\n".join(context_parts)

        # ── Step 3: Load top concepts ─────────────────────────────────────────
        concept_rows = db.scalars(
            select(DocumentConcept)
            .where(DocumentConcept.document_id == document_id)
            .order_by(DocumentConcept.score.desc())
            .limit(25)
        ).all()

        concepts_str = ", ".join(c.term for c in concept_rows) if concept_rows else "N/A"

        # ── Step 4: Build prompt and call Mistral ──────────────────────────────
        # Ask for more questions than needed to allow for filtering
        target = min(num_questions + max(5, num_questions // 3), 50)

        prompt = _GENERATION_PROMPT.format(
            context=context,
            concepts=concepts_str,
            num_questions=target,
            difficulty=difficulty,
            difficulty_instructions=_DIFFICULTY_INSTRUCTIONS[difficulty],
        )

        raw_text, prompt_tokens, completion_tokens, total_tokens = _call_llm_json(
            prompt, temperature=0.4
        )

        # ── Step 5: Parse JSON ────────────────────────────────────────────────
        try:
            data = _extract_json(raw_text)
            raw_questions: list[dict[str, Any]] = data.get("questions", [])
        except (json.JSONDecodeError, KeyError) as exc:
            raise ValueError(f"Mistral returned invalid JSON: {exc}") from exc

        logger.info("[Quiz] Mistral returned %d raw questions", len(raw_questions))

        # ── Step 6: Structural validation ─────────────────────────────────────
        valid_questions = [q for q in raw_questions if _validate_question(q)]
        logger.info(
            "[Quiz] %d/%d questions passed structural validation",
            len(valid_questions), len(raw_questions),
        )

        # ── Step 7: LLM re-check ──────────────────────────────────────────────
        verified_questions = _recheck_answers(valid_questions, context)

        # ── Step 8: Deduplicate ───────────────────────────────────────────────
        deduped = _deduplicate(verified_questions)
        logger.info("[Quiz] %d questions after deduplication", len(deduped))

        # Trim to requested count
        final_questions = deduped[:num_questions]

        if not final_questions:
            raise ValueError(
                "No valid questions could be generated. "
                "Try a different document or lower the question count."
            )

        # ── Step 9: Persist ───────────────────────────────────────────────────
        title = f"Quiz — {doc.filename}"
        quiz_id = _persist_quiz(
            db=db,
            document_id=document_id,
            class_id=class_id_str,
            title=title,
            difficulty=difficulty,
            questions=final_questions,
        )

        # ── Update job: completed ─────────────────────────────────────────────
        job.status = JobStatus.completed
        job.quiz_id = quiz_id
        job.total_tokens = total_tokens
        db.commit()

        logger.info(
            "[Quiz] Job %s completed: quiz_id=%d questions=%d tokens=%d",
            job_id, quiz_id, len(final_questions), total_tokens,
        )
        return {
            "quiz_id": quiz_id,
            "questions_count": len(final_questions),
            "total_tokens": total_tokens,
        }

    except Exception as exc:
        logger.error("[Quiz] generate_quiz_task FAILED: job=%s error=%s", job_id, exc, exc_info=True)

        # Update job to failed
        try:
            job = db.scalar(select(QuizJob).where(QuizJob.id == uuid.UUID(job_id)))
            if job:
                job.status = JobStatus.failed
                job.error_message = str(exc)[:1000]
                db.commit()
        except Exception as db_exc:
            logger.error("[Quiz] Failed to update job status: %s", db_exc)

        raise self.retry(exc=exc)

    finally:
        db.close()
        engine.dispose()


# ── Celery task: auto-correct a submitted attempt ─────────────────────────────

@celery.task(
    name="app.services.quiz_service.correct_quiz_attempt_task",
    bind=True,
    max_retries=2,
    default_retry_delay=10,
)
def correct_quiz_attempt_task(self, attempt_id: int, db_url: str) -> dict:
    """
    Celery task: auto-correct a quiz attempt.

    Steps:
      1. Load the attempt and its student answers.
      2. Load all questions for the quiz with their correct answers.
      3. For MCQ / TrueFalse: compare student answer_text against the
         correct Answer row (is_correct=True) — case-insensitive.
      4. For ShortAnswer: leave is_correct=None (requires manual grading).
      5. Compute score = auto-corrected_correct / auto-correctable_total * 100.
         Score is None when there are no auto-correctable questions.
      6. Persist is_correct flags + score on the attempt.
      7. Create an in-app Notification for the student.

    Note: email confirmation is a future feature (no email provider configured yet).
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker

    from app.models.answer import Answer
    from app.models.notification import Notification
    from app.models.question import Question, QuestionType
    from app.models.quiz import Quiz
    from app.models.quiz_attempt import AttemptStatus, QuizAttempt
    from app.models.student_answer import StudentAnswer
    from app.models.user import User

    engine = create_engine(str(db_url))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    logger.info("[Correct] Starting correction for attempt=%d", attempt_id)

    try:
        # ── 1. Load attempt ───────────────────────────────────────────────────
        attempt = db.scalar(
            select(QuizAttempt).where(QuizAttempt.id == attempt_id)
        )
        if attempt is None:
            logger.error("[Correct] Attempt %d not found", attempt_id)
            return {"error": "attempt not found"}

        if attempt.status != AttemptStatus.submitted:
            logger.warning(
                "[Correct] Attempt %d is not submitted (status=%s) — skipping",
                attempt_id, attempt.status,
            )
            return {"skipped": True}

        # ── 2. Load all quiz questions with their correct answers ──────────────
        questions = db.scalars(
            select(Question).where(Question.quiz_id == attempt.quiz_id)
        ).all()

        # Build lookup maps for auto-correctable questions
        correct_text: dict[int, str] = {}
        question_points: dict[int, int] = {}
        for q in questions:
            if q.type in (QuestionType.mcq, QuestionType.true_false):
                correct_ans = db.scalar(
                    select(Answer).where(
                        Answer.question_id == q.id,
                        Answer.is_correct.is_(True),
                    )
                )
                if correct_ans:
                    correct_text[q.id] = correct_ans.text.strip().casefold()
                    question_points[q.id] = q.points

        logger.info(
            "[Correct] Attempt %d: %d auto-correctable questions (total points: %d)",
            attempt_id,
            len(correct_text),
            sum(question_points.values()),
        )

        # ── 3. Load student answers ───────────────────────────────────────────
        student_answers = db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt_id)
        ).all()

        # ── 4. Grade + compute weighted score ─────────────────────────────────
        student_answers, score = _compute_correction(
            student_answers, correct_text, question_points
        )
        attempt.score = score

        auto_correctable = set(correct_text.keys())
        correct_count = sum(
            1 for sa in student_answers
            if sa.question_id in auto_correctable and sa.is_correct
        )
        answered_auto = sum(
            1 for sa in student_answers if sa.question_id in auto_correctable
        )

        db.flush()

        logger.info(
            "[Correct] Attempt %d graded: score=%s earned=%d/%d questions correct=%d/%d",
            attempt_id,
            f"{score:.2f}%" if score is not None else "None",
            sum(
                question_points.get(sa.question_id, 1)
                for sa in student_answers
                if sa.question_id in auto_correctable and sa.is_correct
            ),
            sum(question_points.values()),
            correct_count,
            answered_auto,
        )

        # ── 5. In-app notification for the student ────────────────────────────
        quiz = db.scalar(select(Quiz).where(Quiz.id == attempt.quiz_id))
        quiz_title = quiz.title if quiz else f"Quiz #{attempt.quiz_id}"
        score_str = (
            f"{attempt.score:.1f}%" if attempt.score is not None else "en attente de correction"
        )

        db.add(
            Notification(
                id=uuid.uuid4(),
                user_id=attempt.student_id,
                type="quiz_result",
                title=f"Résultats : {quiz_title}",
                body=(
                    f"Votre tentative a été corrigée. "
                    f"Score : {score_str} "
                    f"({correct_count}/{len(auto_correctable)} réponses correctes)."
                ),
                data={
                    "attempt_id": attempt_id,
                    "quiz_id": attempt.quiz_id,
                    "score": attempt.score,
                    "correct": correct_count,
                    "total": len(auto_correctable),
                },
            )
        )

        db.commit()

        # ── 6. Dispatch ShortAnswer grading if needed ─────────────────────────
        has_short_answer = any(
            q.type == QuestionType.short_answer for q in questions
        )
        if has_short_answer:
            from app.services.grading_service import grade_short_answers_task
            grade_short_answers_task.delay(
                attempt_id=attempt_id,
                db_url=str(db_url),
            )
            logger.info(
                "[Correct] Dispatched grade_short_answers_task for attempt=%d", attempt_id
            )

        return {
            "attempt_id": attempt_id,
            "score": attempt.score,
            "correct": correct_count,
            "total_auto_correctable": len(auto_correctable),
            "short_answer_grading_queued": has_short_answer,
        }

    except Exception as exc:
        logger.error(
            "[Correct] correct_quiz_attempt_task FAILED: attempt=%d error=%s",
            attempt_id, exc, exc_info=True,
        )
        try:
            db.rollback()
        except Exception:
            pass
        raise self.retry(exc=exc)

    finally:
        db.close()
        engine.dispose()
