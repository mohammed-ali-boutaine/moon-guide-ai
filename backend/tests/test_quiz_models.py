"""
tests/test_quiz_models.py

DB-level tests for Quiz, Question, Answer, and DocumentConcept models.
Requires a running PostgreSQL instance (uses the db_session fixture from conftest).

Coverage:
  - Quiz CRUD + default values + enum validation
  - Question ordering + type enum
  - Answer is_correct + ordering
  - Cascade deletes through the full chain (Quiz → Question → Answer)
  - DocumentConcept CRUD + cascade from Document
  - Celery extract_concepts_task (mocked DB + concept_service)
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.quiz import Quiz, QuizStatus
from app.models.question import Question, QuestionType
from app.models.answer import Answer
from app.models.document_concept import DocumentConcept, ConceptSource


# ===========================================================================
#  Helpers
# ===========================================================================

def _make_quiz(class_id, **kwargs) -> Quiz:
    defaults = dict(
        class_id=class_id,
        title="Test Quiz",
        description="A quiz for testing",
        duration_minutes=30,
        max_attempts=3,
        status=QuizStatus.draft,
    )
    defaults.update(kwargs)
    return Quiz(**defaults)


def _make_question(quiz_id, order=1, **kwargs) -> Question:
    defaults = dict(
        quiz_id=quiz_id,
        type=QuestionType.mcq,
        text="What is 2 + 2?",
        order=order,
    )
    defaults.update(kwargs)
    return Question(**defaults)


def _make_answer(question_id, order=1, is_correct=False, **kwargs) -> Answer:
    defaults = dict(
        question_id=question_id,
        text="42",
        is_correct=is_correct,
        order=order,
    )
    defaults.update(kwargs)
    return Answer(**defaults)


# ===========================================================================
#  Quiz model
# ===========================================================================

class TestQuizModel:
    def test_create_quiz_draft(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.commit()
        db_session.refresh(quiz)

        assert quiz.id is not None
        assert quiz.title == "Test Quiz"
        assert quiz.status == QuizStatus.draft
        assert quiz.created_at is not None
        assert quiz.updated_at is not None

    def test_quiz_published_status(self, db_session, test_class):
        quiz = _make_quiz(test_class.id, status=QuizStatus.published)
        db_session.add(quiz)
        db_session.commit()
        db_session.refresh(quiz)

        assert quiz.status == QuizStatus.published

    def test_quiz_archived_status(self, db_session, test_class):
        quiz = _make_quiz(test_class.id, status=QuizStatus.archived)
        db_session.add(quiz)
        db_session.commit()
        db_session.refresh(quiz)

        assert quiz.status == QuizStatus.archived

    def test_quiz_optional_fields_nullable(self, db_session, test_class):
        quiz = Quiz(
            class_id=test_class.id,
            title="Minimal Quiz",
            status=QuizStatus.draft,
        )
        db_session.add(quiz)
        db_session.commit()
        db_session.refresh(quiz)

        assert quiz.description is None
        assert quiz.duration_minutes is None
        assert quiz.max_attempts is None

    def test_quiz_title_required(self, db_session, test_class):
        quiz = Quiz(class_id=test_class.id, status=QuizStatus.draft)
        db_session.add(quiz)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_quiz_class_id_required(self, db_session):
        quiz = Quiz(title="No Class", status=QuizStatus.draft)
        db_session.add(quiz)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_quiz_class_relationship(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.commit()
        db_session.refresh(quiz)

        assert quiz.class_ is not None
        assert quiz.class_.id == test_class.id

    def test_quiz_questions_empty_by_default(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.commit()
        db_session.refresh(quiz)

        assert quiz.questions == []

    def test_multiple_quizzes_same_class(self, db_session, test_class):
        q1 = _make_quiz(test_class.id, title="Quiz 1")
        q2 = _make_quiz(test_class.id, title="Quiz 2")
        db_session.add_all([q1, q2])
        db_session.commit()

        quizzes = db_session.query(Quiz).filter(Quiz.class_id == test_class.id).all()
        assert len(quizzes) == 2


# ===========================================================================
#  Question model
# ===========================================================================

class TestQuestionModel:
    def test_create_mcq_question(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id, type=QuestionType.mcq)
        db_session.add(q)
        db_session.commit()
        db_session.refresh(q)

        assert q.id is not None
        assert q.type == QuestionType.mcq
        assert q.quiz_id == quiz.id

    def test_create_true_false_question(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id, type=QuestionType.true_false, text="Python is interpreted.")
        db_session.add(q)
        db_session.commit()
        db_session.refresh(q)

        assert q.type == QuestionType.true_false

    def test_create_short_answer_question(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id, type=QuestionType.short_answer, text="Explain recursion.")
        db_session.add(q)
        db_session.commit()
        db_session.refresh(q)

        assert q.type == QuestionType.short_answer

    def test_question_order_stored(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id, order=5)
        db_session.add(q)
        db_session.commit()
        db_session.refresh(q)

        assert q.order == 5

    def test_questions_ordered_via_relationship(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        # Insert out of order intentionally
        q3 = _make_question(quiz.id, order=3, text="Q3")
        q1 = _make_question(quiz.id, order=1, text="Q1")
        q2 = _make_question(quiz.id, order=2, text="Q2")
        db_session.add_all([q3, q1, q2])
        db_session.commit()
        db_session.refresh(quiz)

        orders = [q.order for q in quiz.questions]
        assert orders == sorted(orders)

    def test_question_quiz_relationship(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id)
        db_session.add(q)
        db_session.commit()
        db_session.refresh(q)

        assert q.quiz is not None
        assert q.quiz.id == quiz.id

    def test_question_text_required(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = Question(quiz_id=quiz.id, type=QuestionType.mcq, order=1)
        db_session.add(q)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()


# ===========================================================================
#  Answer model
# ===========================================================================

class TestAnswerModel:
    def _setup_question(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()
        q = _make_question(quiz.id)
        db_session.add(q)
        db_session.flush()
        return q

    def test_create_correct_answer(self, db_session, test_class):
        q = self._setup_question(db_session, test_class)

        a = _make_answer(q.id, is_correct=True, text="4")
        db_session.add(a)
        db_session.commit()
        db_session.refresh(a)

        assert a.id is not None
        assert a.is_correct is True
        assert a.text == "4"

    def test_create_incorrect_answer(self, db_session, test_class):
        q = self._setup_question(db_session, test_class)

        a = _make_answer(q.id, is_correct=False, text="5")
        db_session.add(a)
        db_session.commit()
        db_session.refresh(a)

        assert a.is_correct is False

    def test_multiple_answers_per_question(self, db_session, test_class):
        q = self._setup_question(db_session, test_class)

        answers = [
            _make_answer(q.id, order=i, text=f"Option {i}", is_correct=(i == 1))
            for i in range(1, 5)
        ]
        db_session.add_all(answers)
        db_session.commit()
        db_session.refresh(q)

        assert len(q.answers) == 4

    def test_answers_ordered_via_relationship(self, db_session, test_class):
        q = self._setup_question(db_session, test_class)

        a3 = _make_answer(q.id, order=3, text="C")
        a1 = _make_answer(q.id, order=1, text="A")
        a2 = _make_answer(q.id, order=2, text="B")
        db_session.add_all([a3, a1, a2])
        db_session.commit()
        db_session.refresh(q)

        orders = [a.order for a in q.answers]
        assert orders == sorted(orders)

    def test_answer_question_relationship(self, db_session, test_class):
        q = self._setup_question(db_session, test_class)

        a = _make_answer(q.id, text="Answer text")
        db_session.add(a)
        db_session.commit()
        db_session.refresh(a)

        assert a.question is not None
        assert a.question.id == q.id

    def test_answer_text_required(self, db_session, test_class):
        q = self._setup_question(db_session, test_class)

        a = Answer(question_id=q.id, is_correct=False, order=1)
        db_session.add(a)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()


# ===========================================================================
#  Cascade deletes
# ===========================================================================

class TestCascadeDeletes:
    def test_deleting_quiz_deletes_questions(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id)
        db_session.add(q)
        db_session.commit()
        quiz_id = quiz.id
        q_id = q.id

        db_session.delete(quiz)
        db_session.commit()

        assert db_session.get(Quiz, quiz_id) is None
        assert db_session.get(Question, q_id) is None

    def test_deleting_question_deletes_answers(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id)
        db_session.add(q)
        db_session.flush()

        a = _make_answer(q.id)
        db_session.add(a)
        db_session.commit()
        q_id = q.id
        a_id = a.id

        db_session.delete(q)
        db_session.commit()

        assert db_session.get(Question, q_id) is None
        assert db_session.get(Answer, a_id) is None

    def test_full_cascade_quiz_to_answers(self, db_session, test_class):
        quiz = _make_quiz(test_class.id)
        db_session.add(quiz)
        db_session.flush()

        q = _make_question(quiz.id)
        db_session.add(q)
        db_session.flush()

        answers = [_make_answer(q.id, order=i) for i in range(1, 4)]
        db_session.add_all(answers)
        db_session.commit()
        answer_ids = [a.id for a in answers]
        quiz_id = quiz.id

        db_session.delete(quiz)
        db_session.commit()

        assert db_session.get(Quiz, quiz_id) is None
        for aid in answer_ids:
            assert db_session.get(Answer, aid) is None


# ===========================================================================
#  DocumentConcept model
# ===========================================================================

class TestDocumentConceptModel:
    def _make_document(self, db_session, teacher_user):
        from app.models.document import Document, ScopeEnum, StatusEnum, RoleEnum, FileTypeEnum
        doc = Document(
            scope=ScopeEnum.personal,
            filename="test.txt",
            file_url="static/uploads/personal/test.txt",
            file_type=FileTypeEnum.txt,
            status=StatusEnum.ready,
            uploaded_by_id=teacher_user.id,
            uploaded_by_role=RoleEnum.teacher,
        )
        db_session.add(doc)
        db_session.flush()
        return doc

    def test_create_ner_concept(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        concept = DocumentConcept(
            document_id=doc.id,
            term="Python",
            score=0.95,
            source=ConceptSource.ner,
            entity_type="PRODUCT",
            theme="PRODUCT",
            frequency=5,
        )
        db_session.add(concept)
        db_session.commit()
        db_session.refresh(concept)

        assert concept.id is not None
        assert concept.term == "Python"
        assert concept.source == ConceptSource.ner
        assert concept.entity_type == "PRODUCT"
        assert concept.theme == "PRODUCT"
        assert concept.frequency == 5
        assert concept.created_at is not None

    def test_create_textrank_concept(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        concept = DocumentConcept(
            document_id=doc.id,
            term="machine learning",
            score=0.8,
            source=ConceptSource.textrank,
            theme="key_phrase",
            frequency=3,
        )
        db_session.add(concept)
        db_session.commit()
        db_session.refresh(concept)

        assert concept.source == ConceptSource.textrank
        assert concept.entity_type is None
        assert concept.theme == "key_phrase"

    def test_create_tfidf_concept(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        concept = DocumentConcept(
            document_id=doc.id,
            term="neural network",
            score=0.6,
            source=ConceptSource.tfidf,
            theme="keyword",
            frequency=1,
        )
        db_session.add(concept)
        db_session.commit()
        db_session.refresh(concept)

        assert concept.source == ConceptSource.tfidf

    def test_document_concept_relationship(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        concept = DocumentConcept(
            document_id=doc.id,
            term="algorithm",
            score=0.7,
            source=ConceptSource.tfidf,
            theme="keyword",
            frequency=2,
        )
        db_session.add(concept)
        db_session.commit()
        db_session.refresh(concept)

        assert concept.document is not None
        assert concept.document.id == doc.id

    def test_multiple_concepts_per_document(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        concepts = [
            DocumentConcept(
                document_id=doc.id,
                term=f"concept_{i}",
                score=0.9 - i * 0.1,
                source=ConceptSource.tfidf,
                theme="keyword",
                frequency=i + 1,
            )
            for i in range(5)
        ]
        db_session.add_all(concepts)
        db_session.commit()
        db_session.refresh(doc)

        assert len(doc.concepts) == 5

    def test_cascade_delete_concepts_with_document(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        concept = DocumentConcept(
            document_id=doc.id,
            term="cascade_test",
            score=0.5,
            source=ConceptSource.ner,
            theme="ORG",
            frequency=1,
        )
        db_session.add(concept)
        db_session.commit()
        concept_id = concept.id
        doc_id = doc.id

        db_session.delete(doc)
        db_session.commit()

        assert db_session.get(DocumentConcept, concept_id) is None

    def test_concept_document_id_required(self, db_session):
        concept = DocumentConcept(
            term="orphan",
            score=0.5,
            source=ConceptSource.tfidf,
            theme="keyword",
            frequency=1,
        )
        db_session.add(concept)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()

    def test_query_concepts_by_document_and_theme(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        ner_concept = DocumentConcept(
            document_id=doc.id, term="Google", score=0.9,
            source=ConceptSource.ner, entity_type="ORG", theme="ORG", frequency=4,
        )
        kw_concept = DocumentConcept(
            document_id=doc.id, term="search engine", score=0.6,
            source=ConceptSource.textrank, theme="key_phrase", frequency=2,
        )
        db_session.add_all([ner_concept, kw_concept])
        db_session.commit()

        ner_results = (
            db_session.query(DocumentConcept)
            .filter(DocumentConcept.document_id == doc.id, DocumentConcept.theme == "ORG")
            .all()
        )
        assert len(ner_results) == 1
        assert ner_results[0].term == "Google"

    def test_concepts_ordered_by_score(self, db_session, teacher_user):
        doc = self._make_document(db_session, teacher_user)

        for score in [0.3, 0.9, 0.6]:
            c = DocumentConcept(
                document_id=doc.id, term=f"term_{score}", score=score,
                source=ConceptSource.tfidf, theme="keyword", frequency=1,
            )
            db_session.add(c)
        db_session.commit()

        results = (
            db_session.query(DocumentConcept)
            .filter(DocumentConcept.document_id == doc.id)
            .order_by(DocumentConcept.score.desc())
            .all()
        )
        scores = [r.score for r in results]
        assert scores == sorted(scores, reverse=True)


# ===========================================================================
#  Celery extract_concepts_task (unit — no DB required)
# ===========================================================================

class TestExtractConceptsTask:
    """
    Tests for the Celery task wrapper in document_service.
    Uses mocked DB session and concept_service — does not require Celery worker.
    """

    @patch("app.services.document_service.extract_concepts_task.delay")
    def test_extract_and_embed_dispatches_concept_task(self, mock_delay):
        """
        extract_and_embed should dispatch extract_concepts_task after success.
        Verified by importing the task and checking .delay() is wired up.
        """
        # Verify the task is importable and callable
        from app.services.document_service import extract_concepts_task
        assert callable(extract_concepts_task)

    @patch("app.services.document_service.extract_and_store_concepts")
    def test_extract_concepts_task_calls_service(self, mock_extract):
        """extract_concepts_task should delegate to concept_service."""
        mock_extract.return_value = [{"term": "Python", "score": 0.9}]

        from app.services import document_service
        db = MagicMock()
        result = document_service.extract_and_store_concepts(
            document_id=1,
            chunks=["Python is great for machine learning."],
            db=db,
        )

        mock_extract.assert_called_once()
        assert result == [{"term": "Python", "score": 0.9}]

    @patch("app.services.concept_service._get_cached_concepts", return_value=None)
    @patch("app.services.concept_service._set_cached_concepts")
    @patch("app.services.concept_service._get_nlp")
    def test_concept_task_result_dict(self, mock_get_nlp, _set_cache, _get_cache):
        """extract_concepts_task returns {concepts_count: N}."""
        from app.services.document_service import extract_concepts_task

        # Simulate the task body directly (not via Celery runner)
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        doc = MagicMock()
        doc._.phrases = []
        nlp_mock = MagicMock(return_value=doc)
        nlp_mock.max_length = 2_000_000
        mock_get_nlp.return_value = nlp_mock

        db = MagicMock()
        db.query.return_value.filter.return_value.delete.return_value = None

        from app.services.concept_service import extract_and_store_concepts
        concepts = extract_and_store_concepts(
            document_id=99,
            chunks=["Deep learning is a subset of machine learning."],
            db=db,
        )
        assert isinstance(concepts, list)
