"""
routes/notifications.py

In-app notification endpoints:
  GET   /notifications              – list current user's notifications (unread first)
  PATCH /notifications/{id}/read    – mark one notification as read
  PATCH /notifications/read-all     – mark all as read
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.models.notification import Notification
from app.schemas.quiz_assignment import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── GET /notifications ────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=list[NotificationResponse],
    summary="List current user's notifications",
)
def list_notifications(
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
    unread_only: bool = False,
    limit: int = 50,
) -> list[NotificationResponse]:
    """
    Return the authenticated user's notifications, newest first.

    - `unread_only=true` filters to unread notifications only.
    - `limit` caps the result set (default 50, max 200).
    """
    limit = min(limit, 200)
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))

    notifications = db.scalars(stmt).all()
    return [NotificationResponse.model_validate(n) for n in notifications]


# ── PATCH /notifications/read-all ─────────────────────────────────────────────
# NOTE: registered BEFORE /{notification_id}/read to avoid routing conflict

@router.patch(
    "/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark all notifications as read",
)
def mark_all_read(
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> None:
    db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    db.commit()
    logger.info("All notifications marked read for user=%s", current_user.email)


# ── PATCH /notifications/{id}/read ───────────────────────────────────────────

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a single notification as read",
)
def mark_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> NotificationResponse:
    notif = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notif is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationResponse.model_validate(notif)
