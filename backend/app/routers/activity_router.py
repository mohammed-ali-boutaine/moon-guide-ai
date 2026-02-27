from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.user_activity import UserActivity

router = APIRouter(prefix="/api/users", tags=["activity"])


@router.get("/me/activity")
async def get_my_activity(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Return the last 10 activities for the current user, newest first.
    """
    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == current_user.id)
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


def log_activity(
    db: DBSession,
    user_id,
    action: str,
    request=None,
) -> None:
    """Helper to record a user activity row."""
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
