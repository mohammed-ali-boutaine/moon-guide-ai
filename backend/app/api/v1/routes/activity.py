# app/api/v1/routes/activity.py
"""
Activity routes — validate input → call ActivityService → return response.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/users", tags=["activity"])


@router.get("/me/activity", summary="Get my recent activity")
async def get_my_activity(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Return the last 10 activity events for the authenticated user."""
    return ActivityService.get_user_activity(db, current_user.id)
