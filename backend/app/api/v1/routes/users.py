# app/api/v1/routes/users.py
"""
User profile routes — validate input → call UserService → return response.
"""
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, get_current_user
from app.models.user import User
from app.schemas.auth import UserProfileUpdate
from app.schemas.user_schema import AvatarUploadResponse, ProfileUpdateResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", summary="Get current user profile")
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Return public profile data for the authenticated user."""
    return UserService.get_profile(current_user)


@router.put("/me", response_model=ProfileUpdateResponse, summary="Update current user profile")
async def update_current_user_profile(
    profile_data: UserProfileUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update name, display name, or password for the authenticated user."""
    return UserService.update_profile(db, current_user, profile_data)


@router.patch(
    "/me/avatar",
    response_model=AvatarUploadResponse,
    summary="Upload profile avatar",
)
async def upload_avatar(
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a new avatar image for the authenticated user."""
    avatar_url = UserService.upload_avatar(db, current_user, file)
    return AvatarUploadResponse(avatar_url=avatar_url)
