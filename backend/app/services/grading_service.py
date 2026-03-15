"""
services/grading_service.py

LLM-based grading and feedback generation for quiz attempts.

Two Celery tasks:
  1. grade_short_answers_task   — scores ShortAnswer questions via Gemini,
                                  recalculates weighted attempt score.
  2. generate_feedback_task     — generates per-question LLM feedback for
                                  all question types in an attempt.

Similarity metrics (BLEU / ROUGE-L) are computed locally for cost-free
pre-screening; Gemini provides the final nuanced 0-100 score.

Cost monitoring: prompt_tokens + completion_tokens + total_tokens are stored
on every ShortAnswerGrade and QuestionFeedback row.
"""
from __future__ import annotations

import json
import re
import time
import uuid
from typing import Any

from app.celery_app import celery
from app.core.config import settings
from app.core.logging import logger

# ── Similarity helpers (pure, no I/O) ─────────────────────────────────────────

# Confidence threshold below which the grade is flagged for teacher review
_REVIEW_THRESHOLD = 40.0


def _tokenize(text: str) -> list[str]:
    """Lowercase word-level tokenization."""
    return re.findall(r"\b\w+\b", text.lower())


def _bleu_1gram(reference: str, hypothesis: str) -> float:
    """
    Unigram BLEU (precision of hypothesis tokens present in reference).
    Falls back to simple keyword overlap when nltk is unavailable.
    """
    try:
        from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
        ref_tokens = _tokenize(reference)
        hyp_tokens = _tokenize(hypothesis)
        if not hyp_tokens:
            return 0.0
        smoothing = SmoothingFunction().method1
        return float(sentence_bleu([ref_tokens], hyp_tokens, smoothing_function=smoothing))
    except ImportError:
        pass

    # Fallback: simple unigram precision
    ref_set = set(_tokenize(reference))
    hyp_tokens = _tokenize(hypothesis)
    if not hyp_tokens:
        return 0.0
    matches = sum(1 for t in hyp_tokens if t in ref_set)
    return matches / len(hyp_tokens)


def _rouge_l(reference: str, hypothesis: str) -> float:
    """
    ROUGE-L F1 (longest common subsequence).
    Falls back to simple recall-based overlap when rouge_score is unavailable.
    """
    try:
        from rouge_score import rouge_scorer
        scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
        scores = scorer.score(reference, hypothesis)
        return float(scores["rougeL"].fmeasure)
    except ImportError:
        pass

    # Fallback: unigram recall
    ref_tokens = set(_tokenize(reference))
    hyp_tokens = _tokenize(hypothesis)
    if not ref_tokens:
        return 0.0
    matches = sum(1 for t in hyp_tokens if t in ref_tokens)
    return matches / len(ref_tokens)


def compute_similarity(reference: str, hypothesis: str) -> dict[str, float]:
    """Return {'bleu': float, 'rouge_l': float} for a (reference, hypothesis) pair."""
    return {
        "bleu": _bleu_1gram(reference, hypothesis),
        "rouge_l": _rouge_l(reference, hypothesis),
    }


# ── Gemini helper ─────────────────────────────────────────────────────────────

def _call_gemini_json(prompt: str, temperature: float = 0.2) -> tuple[str, int, int, int]:
    """
    Call Gemini and return (raw_text, prompt_tokens, completion_tokens, total_tokens).
    """
    from google import genai
    from google.genai import types as genai_types
    from google.genai import errors as genai_errors

    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    delay = settings.GEMINI_RETRY_DELAY
    last_exc: Exception | None = None

    for attempt_num in range(1, settings.GEMINI_MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    max_output_tokens=2048,
                    temperature=temperature,
                ),
            )
            text = response.text or ""
            usage = getattr(response, "usage_metadata", None)
            pt = getattr(usage, "prompt_token_count", 0) or 0
            ct = getattr(usage, "candidates_token_count", 0) or 0
            tt = getattr(usage, "total_token_count", 0) or (pt + ct)
            logger.info(
                "[Grading] Gemini call ok: attempt=%d tokens(p=%d c=%d t=%d)",
                attempt_num, pt, ct, tt,
            )
            return text, pt, ct, tt
        except genai_errors.ClientError as exc:
            if getattr(exc, "status_code", None) == 429:
                logger.warning("[Grading] Rate limit (attempt %d): %s", attempt_num, exc)
                last_exc = exc
            else:
                raise RuntimeError(f"Gemini client error: {exc}") from exc
        except Exception as exc:
            logger.warning("[Grading] Gemini error (attempt %d): %s", attempt_num, exc)
            last_exc = exc

        if attempt_num < settings.GEMINI_MAX_RETRIES:
            time.sleep(delay)
            delay *= 2

    raise RuntimeError(
        f"Gemini failed after {settings.GEMINI_MAX_RETRIES} attempts. Last: {last_exc}"
    )


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


# ── Grading prompt ────────────────────────────────────────────────────────────

_GRADE_SYSTEM = """\
You are an expert educator grading a student's short-answer response.
Grade objectively and fairly. Be strict about factual accuracy but give
partial credit for partially correct answers.
"""

_GRADE_PROMPT = """\
## Question
{question_text}

## Expected Answer (model answer)
{expected_answer}

## Student's Answer
{student_answer}

## Similarity Metrics (pre-computed)
- BLEU-1: {bleu:.3f}
- ROUGE-L: {rouge_l:.3f}

## Task
Grade the student's answer on a scale of 0 to 100 based on:
1. **Keyword coverage** (30%): Key terms from the expected answer present in the student's answer.
2. **Conceptual accuracy** (50%): Is the core meaning/concept correct?
3. **Completeness** (20%): Is the answer sufficiently complete?

Edge cases:
- Empty or blank answer: score = 0
- Answer that is completely off-topic: score = 0
- Partially correct answer: give proportional credit

Output ONLY valid JSON (no markdown, no extra text):
{{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>",
  "needs_review": <true if low confidence or borderline, else false>
}}
"""

_FEEDBACK_SYSTEM = """\
You are a supportive and constructive educator providing personalized quiz feedback.
Be encouraging, specific, and actionable. Write in the same language as the student's answer.
If the student's answer is in French, respond in French.
"""

_FEEDBACK_PROMPT = """\
## Quiz: {quiz_title}

## Questions and Results

{questions_block}

## Task
For each question above, generate personalized feedback in this exact JSON format.
Be constructive and encouraging even for incorrect answers.

Output ONLY valid JSON:
{{
  "feedbacks": [
    {{
      "question_id": <int>,
      "feedback_text": "<1-3 sentence encouraging and informative feedback>",
      "key_points": ["<point 1>", "<point 2>", "<point 3 max>"],
      "improvement_suggestion": "<one specific actionable suggestion, or null if answer was perfect>"
    }}
  ]
}}
"""


def _build_question_block(
    question_text: str,
    question_type: str,
    student_answer: str | None,
    correct_answer: str | None,
    is_correct: bool | None,
    llm_score: float | None,
    question_id: int,
) -> str:
    """Format a single question's context for the feedback prompt."""
    lines = [
        f"### Question {question_id}: {question_text}",
        f"Type: {question_type}",
        f"Student answered: {student_answer or '(no answer)'}",
    ]
    if correct_answer:
        lines.append(f"Expected answer: {correct_answer}")
    if is_correct is True:
        lines.append("Result: CORRECT")
    elif is_correct is False:
        lines.append("Result: INCORRECT")
    else:
        lines.append(f"Result: PARTIAL (LLM score: {llm_score:.0f}/100)" if llm_score is not None else "Result: PENDING REVIEW")
    return "\n".join(lines)


# ── Celery task: grade short answers ──────────────────────────────────────────

@celery.task(
    name="app.services.grading_service.grade_short_answers_task",
    bind=True,
    max_retries=2,
    default_retry_delay=15,
)
def grade_short_answers_task(self, attempt_id: int, db_url: str) -> dict:
    """
    Celery task: LLM-grade all ShortAnswer responses for an attempt.

    Steps:
      1. Load all ShortAnswer student answers for the attempt.
      2. For each: get model answer, compute BLEU/ROUGE, call Gemini.
      3. Store in ShortAnswerGrade, update StudentAnswer.llm_score + needs_review.
      4. Recalculate weighted attempt.score including short answers.
      5. Update in-app notification with revised score.

    Short answers without a model answer (is_correct=True Answer row) are
    flagged with needs_review=True and score=0 until a teacher grades them.
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker

    from app.models.answer import Answer
    from app.models.notification import Notification
    from app.models.question import Question, QuestionType
    from app.models.quiz import Quiz
    from app.models.quiz_attempt import AttemptStatus, QuizAttempt
    from app.models.short_answer_grade import ShortAnswerGrade
    from app.models.student_answer import StudentAnswer

    engine = create_engine(str(db_url))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    logger.info("[GradeShort] Starting for attempt=%d", attempt_id)

    try:
        attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
        if attempt is None:
            logger.error("[GradeShort] Attempt %d not found", attempt_id)
            return {"error": "attempt not found"}

        # Load all questions for this quiz
        questions = db.scalars(
            select(Question).where(Question.quiz_id == attempt.quiz_id)
        ).all()

        short_answer_questions = [q for q in questions if q.type == QuestionType.short_answer]
        if not short_answer_questions:
            logger.info("[GradeShort] No ShortAnswer questions for attempt=%d", attempt_id)
            return {"graded": 0}

        total_tokens_used = 0
        graded_count = 0
        review_count = 0

        for q in short_answer_questions:
            # Get the student's answer
            sa = db.scalar(
                select(StudentAnswer).where(
                    StudentAnswer.attempt_id == attempt_id,
                    StudentAnswer.question_id == q.id,
                )
            )
            if sa is None:
                logger.info(
                    "[GradeShort] No answer for question=%d attempt=%d — skipping",
                    q.id, attempt_id,
                )
                continue

            # Get the model answer (is_correct=True Answer row)
            model_ans = db.scalar(
                select(Answer).where(
                    Answer.question_id == q.id,
                    Answer.is_correct.is_(True),
                )
            )
            expected_text = model_ans.text.strip() if model_ans else ""

            # ── Edge case: no model answer → flag for review ──────────────────
            if not expected_text:
                logger.warning(
                    "[GradeShort] question=%d has no model answer — flagging review",
                    q.id,
                )
                sa.llm_score = None
                sa.needs_review = True
                sa.is_correct = None  # stays pending until teacher grades
                review_count += 1
                continue

            # ── Edge case: blank student answer ───────────────────────────────
            student_text = (sa.answer_text or "").strip()
            if not student_text:
                logger.info(
                    "[GradeShort] Blank answer for question=%d — score=0", q.id
                )
                sa.llm_score = 0.0
                sa.needs_review = False
                sa.is_correct = False

                db.merge(
                    ShortAnswerGrade(
                        id=uuid.uuid4(),
                        student_answer_id=sa.id,
                        attempt_id=attempt_id,
                        question_id=q.id,
                        expected_answer=expected_text,
                        llm_score=0.0,
                        llm_reasoning="Student did not provide an answer.",
                        bleu_score=0.0,
                        rouge_l_score=0.0,
                        needs_review=False,
                        model_used=settings.GEMINI_MODEL,
                        prompt_tokens=0,
                        completion_tokens=0,
                        total_tokens=0,
                    )
                )
                graded_count += 1
                continue

            # ── Similarity metrics ────────────────────────────────────────────
            sim = compute_similarity(expected_text, student_text)
            bleu = sim["bleu"]
            rouge_l = sim["rouge_l"]

            # ── Call Gemini for nuanced scoring ───────────────────────────────
            prompt = _GRADE_SYSTEM + "\n\n" + _GRADE_PROMPT.format(
                question_text=q.text,
                expected_answer=expected_text,
                student_answer=student_text,
                bleu=bleu,
                rouge_l=rouge_l,
            )

            try:
                raw, pt, ct, tt = _call_gemini_json(prompt, temperature=0.1)
                total_tokens_used += tt
                data = _extract_json(raw)
                llm_score = float(max(0, min(100, data.get("score", 0))))
                llm_reasoning = str(data.get("reasoning", "No reasoning provided."))
                needs_review = bool(data.get("needs_review", llm_score < _REVIEW_THRESHOLD))
            except Exception as exc:
                logger.warning(
                    "[GradeShort] Gemini grading failed for question=%d: %s — using similarity",
                    q.id, exc,
                )
                # Fallback: use ROUGE-L * 100 as score, flag for review
                llm_score = round(rouge_l * 100, 1)
                llm_reasoning = f"Automatic grading failed; score estimated from similarity ({exc})."
                needs_review = True
                pt = ct = tt = 0

            # ── Update StudentAnswer ──────────────────────────────────────────
            sa.llm_score = llm_score
            sa.needs_review = needs_review
            sa.is_correct = llm_score >= 50.0  # threshold for "correct"

            logger.info(
                "[GradeShort] question=%d score=%.1f needs_review=%s bleu=%.3f rouge=%.3f",
                q.id, llm_score, needs_review, bleu, rouge_l,
            )

            # ── Persist ShortAnswerGrade (upsert via merge) ───────────────────
            existing_grade = db.scalar(
                select(ShortAnswerGrade).where(
                    ShortAnswerGrade.student_answer_id == sa.id
                )
            )
            if existing_grade:
                existing_grade.llm_score = llm_score
                existing_grade.llm_reasoning = llm_reasoning
                existing_grade.bleu_score = bleu
                existing_grade.rouge_l_score = rouge_l
                existing_grade.needs_review = needs_review
                existing_grade.prompt_tokens = pt
                existing_grade.completion_tokens = ct
                existing_grade.total_tokens = tt
            else:
                db.add(
                    ShortAnswerGrade(
                        id=uuid.uuid4(),
                        student_answer_id=sa.id,
                        attempt_id=attempt_id,
                        question_id=q.id,
                        expected_answer=expected_text,
                        llm_score=llm_score,
                        llm_reasoning=llm_reasoning,
                        bleu_score=bleu,
                        rouge_l_score=rouge_l,
                        needs_review=needs_review,
                        model_used=settings.GEMINI_MODEL,
                        prompt_tokens=pt,
                        completion_tokens=ct,
                        total_tokens=tt,
                    )
                )

            graded_count += 1
            if needs_review:
                review_count += 1

        db.flush()

        # ── Recompute weighted attempt score ──────────────────────────────────
        all_questions = {q.id: q for q in questions}
        all_student_answers = db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt_id)
        ).all()

        from app.models.answer import Answer as AnswerModel
        from app.models.question import QuestionType as QType
        from app.services.quiz_service import _compute_correction

        # Rebuild correct_text / question_points for MCQ/TF
        correct_text: dict[int, str] = {}
        question_points: dict[int, int] = {}
        for q in questions:
            if q.type in (QType.mcq, QType.true_false):
                ca = db.scalar(
                    select(AnswerModel).where(
                        AnswerModel.question_id == q.id,
                        AnswerModel.is_correct.is_(True),
                    )
                )
                if ca:
                    correct_text[q.id] = ca.text.strip().lower()
                    question_points[q.id] = q.points

        # Compute total weighted score (MCQ/TF + ShortAnswer)
        total_possible = sum(q.points for q in questions)
        if total_possible == 0:
            total_possible = len(questions)

        earned = 0.0
        pending_any = False
        for sa in all_student_answers:
            q = all_questions.get(sa.question_id)
            if q is None:
                continue
            if q.type in (QType.mcq, QType.true_false):
                if sa.is_correct:
                    earned += q.points
            elif q.type == QType.short_answer:
                if sa.llm_score is not None:
                    earned += q.points * sa.llm_score / 100.0
                else:
                    pending_any = True

        if pending_any:
            # Keep existing MCQ-only score until teacher grades the pending ones
            logger.info(
                "[GradeShort] Attempt %d has pending review answers — score not updated",
                attempt_id,
            )
        else:
            attempt.score = round(earned / total_possible * 100, 2)
            logger.info(
                "[GradeShort] Attempt %d final score=%.2f%%", attempt_id, attempt.score
            )

        db.commit()

        logger.info(
            "[GradeShort] Attempt %d: graded=%d review_flagged=%d total_tokens=%d",
            attempt_id, graded_count, review_count, total_tokens_used,
        )
        return {
            "attempt_id": attempt_id,
            "graded": graded_count,
            "needs_review": review_count,
            "total_tokens": total_tokens_used,
        }

    except Exception as exc:
        logger.error(
            "[GradeShort] FAILED: attempt=%d error=%s", attempt_id, exc, exc_info=True
        )
        try:
            db.rollback()
        except Exception:
            pass
        raise self.retry(exc=exc)

    finally:
        db.close()
        engine.dispose()


# ── Celery task: generate per-question feedback ───────────────────────────────

@celery.task(
    name="app.services.grading_service.generate_feedback_task",
    bind=True,
    max_retries=2,
    default_retry_delay=15,
)
def generate_feedback_task(self, attempt_id: int, db_url: str) -> dict:
    """
    Celery task: generate personalized per-question feedback for an attempt.

    Builds a single Gemini prompt with all questions and results, then
    upserts one QuestionFeedback row per question.

    Should only be called after grading is complete (or at least MCQ/TF
    grading is done). Feedback for ShortAnswer questions reflects the LLM
    score and reasoning.
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker

    from app.models.answer import Answer
    from app.models.question import Question, QuestionType
    from app.models.question_feedback import QuestionFeedback
    from app.models.quiz import Quiz
    from app.models.quiz_attempt import QuizAttempt
    from app.models.short_answer_grade import ShortAnswerGrade
    from app.models.student_answer import StudentAnswer

    engine = create_engine(str(db_url))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    logger.info("[Feedback] Starting for attempt=%d", attempt_id)

    try:
        attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
        if attempt is None:
            return {"error": "attempt not found"}

        quiz = db.scalar(select(Quiz).where(Quiz.id == attempt.quiz_id))
        quiz_title = quiz.title if quiz else f"Quiz #{attempt.quiz_id}"

        questions = db.scalars(
            select(Question).where(Question.quiz_id == attempt.quiz_id)
        ).all()

        # Build lookup maps
        student_answers: dict[int, StudentAnswer] = {
            sa.question_id: sa
            for sa in db.scalars(
                select(StudentAnswer).where(StudentAnswer.attempt_id == attempt_id)
            ).all()
        }

        sa_grades: dict[int, ShortAnswerGrade] = {}
        for sag in db.scalars(
            select(ShortAnswerGrade).where(ShortAnswerGrade.attempt_id == attempt_id)
        ).all():
            sa_grades[sag.question_id] = sag

        # Correct answer lookup (MCQ/TF + ShortAnswer model answer)
        correct_answers: dict[int, str] = {}
        for q in questions:
            ans = db.scalar(
                select(Answer).where(
                    Answer.question_id == q.id,
                    Answer.is_correct.is_(True),
                )
            )
            if ans:
                correct_answers[q.id] = ans.text.strip()

        # ── Build prompt blocks ────────────────────────────────────────────────
        question_blocks: list[str] = []
        for q in questions:
            sa = student_answers.get(q.id)
            student_text = sa.answer_text if sa else None
            is_correct = sa.is_correct if sa else None
            llm_score = sa.llm_score if sa else None

            block = _build_question_block(
                question_text=q.text,
                question_type=q.type.value,
                student_answer=student_text,
                correct_answer=correct_answers.get(q.id),
                is_correct=is_correct,
                llm_score=llm_score,
                question_id=q.id,
            )
            question_blocks.append(block)

        questions_block = "\n\n---\n\n".join(question_blocks)
        prompt = _FEEDBACK_SYSTEM + "\n\n" + _FEEDBACK_PROMPT.format(
            quiz_title=quiz_title,
            questions_block=questions_block,
        )

        # ── Call Gemini ────────────────────────────────────────────────────────
        raw, pt, ct, tt = _call_gemini_json(prompt, temperature=0.4)
        data = _extract_json(raw)
        feedbacks: list[dict] = data.get("feedbacks", [])

        logger.info(
            "[Feedback] Gemini returned %d feedback items (tokens=%d)", len(feedbacks), tt
        )

        # Tokens split evenly across questions (approximate)
        per_q_tokens = max(1, len(questions))
        pt_per = pt // per_q_tokens
        ct_per = ct // per_q_tokens
        tt_per = tt // per_q_tokens

        # ── Persist feedback rows ──────────────────────────────────────────────
        saved = 0
        q_map = {q.id: q for q in questions}

        for fb_data in feedbacks:
            qid = fb_data.get("question_id")
            if qid not in q_map:
                logger.warning("[Feedback] Unknown question_id=%s — skipping", qid)
                continue

            q = q_map[qid]
            sa = student_answers.get(qid)
            is_correct = sa.is_correct if sa else None
            score: float | None = None
            if is_correct is True:
                score = 100.0
            elif is_correct is False:
                score = 0.0
            elif sa and sa.llm_score is not None:
                score = sa.llm_score

            key_points = fb_data.get("key_points", [])
            if not isinstance(key_points, list):
                key_points = []

            existing = db.scalar(
                select(QuestionFeedback).where(
                    QuestionFeedback.attempt_id == attempt_id,
                    QuestionFeedback.question_id == qid,
                )
            )
            if existing:
                existing.feedback_text = str(fb_data.get("feedback_text", ""))
                existing.key_points = key_points
                existing.improvement_suggestion = fb_data.get("improvement_suggestion")
                existing.is_correct = is_correct
                existing.score = score
                existing.prompt_tokens = pt_per
                existing.completion_tokens = ct_per
                existing.total_tokens = tt_per
            else:
                db.add(
                    QuestionFeedback(
                        id=uuid.uuid4(),
                        attempt_id=attempt_id,
                        question_id=qid,
                        feedback_text=str(fb_data.get("feedback_text", "")),
                        key_points=key_points,
                        improvement_suggestion=fb_data.get("improvement_suggestion"),
                        is_correct=is_correct,
                        score=score,
                        prompt_tokens=pt_per,
                        completion_tokens=ct_per,
                        total_tokens=tt_per,
                    )
                )
            saved += 1

        db.commit()

        logger.info(
            "[Feedback] Attempt %d: saved=%d tokens=%d", attempt_id, saved, tt
        )
        return {"attempt_id": attempt_id, "saved": saved, "total_tokens": tt}

    except Exception as exc:
        logger.error(
            "[Feedback] FAILED: attempt=%d error=%s", attempt_id, exc, exc_info=True
        )
        try:
            db.rollback()
        except Exception:
            pass
        raise self.retry(exc=exc)

    finally:
        db.close()
        engine.dispose()
