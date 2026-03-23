"""
notification_service.py

Helpers for creating in-app Notification records.
All functions write to the DB but do NOT commit — callers must commit.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.logging import logger
from app.models.class_student import ClassStudent
from app.models.notification import Notification
from app.models.quiz import Quiz


def notify_class_students(
    db: DBSession,
    *,
    class_id: uuid.UUID,
    notification_type: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> int:
    """
    Create one Notification row per student enrolled in `class_id`.

    Returns the number of notifications created.
    Does NOT commit the session.
    """
    enrollments = db.scalars(
        select(ClassStudent).where(ClassStudent.class_id == class_id)
    ).all()

    count = 0
    for enrollment in enrollments:
        db.add(
            Notification(
                id=uuid.uuid4(),
                user_id=enrollment.student_id,
                type=notification_type,
                title=title,
                body=body,
                data=data,
            )
        )
        count += 1

    logger.info(
        "Queued %d notifications (type=%s, class_id=%s)", count, notification_type, class_id
    )
    return count


def notify_quiz_assigned(
    db: DBSession,
    *,
    quiz: Quiz,
    class_id: uuid.UUID,
    teacher_name: str,
    due_date: str | None = None,
) -> int:
    """Convenience wrapper: notify all students in a class that a quiz was assigned."""
    body_parts = [f'"{quiz.title}" a été assigné à votre classe par {teacher_name}.']
    if due_date:
        body_parts.append(f"Date limite : {due_date}.")

    data: dict[str, Any] = {"quiz_id": quiz.id, "class_id": str(class_id)}
    if due_date:
        data["due_date"] = due_date

    return notify_class_students(
        db,
        class_id=class_id,
        notification_type="quiz_assigned",
        title=f"Nouveau quiz : {quiz.title}",
        body=" ".join(body_parts),
        data=data,
    )
