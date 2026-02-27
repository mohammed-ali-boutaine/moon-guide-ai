# app/services/activity_service.py
from fastapi import Request
from sqlalchemy.orm import Session as DBSession

from app.models.user_activity import UserActivity


class ActivityService:
    """Business logic for user activity tracking."""

    @staticmethod
    def get_user_activity(db: DBSession, user_id) -> list[dict]:
        """
        Return the last 10 activities for the given user, newest first.
        """
        activities = (
            db.query(UserActivity)
            .filter(UserActivity.user_id == user_id)
            .order_by(UserActivity.created_at.desc())
            .limit(10)
            .all()
        )
        return [
            {
                "id": str(a.id),
                "action": a.action,
                "ip_address": a.ip_address,
                "user_agent": a.user_agent,
                "created_at": a.created_at.isoformat(),
            }
            for a in activities
        ]

    @staticmethod
    def log_activity(
        db: DBSession,
        user_id,
        action: str,
        request: Request | None = None,
    ) -> None:
        """Record a user activity row."""
        ip = None
        ua = None
        if request:
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")
        activity = UserActivity(
            user_id=user_id,
            action=action,
            ip_address=ip,
            user_agent=ua,
        )
        db.add(activity)
        db.commit()
