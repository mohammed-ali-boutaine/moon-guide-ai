# app/api/routes/users.py
from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.name if current_user.role else None,
        "profile": {
            "first_name": current_user.profile.first_name,
            "last_name": current_user.profile.last_name,
            "avatar_url": current_user.profile.avatar_url,
        } if current_user.profile else None,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }


@router.get("/classes")
async def get_my_classes(
    current_user: User = Depends(get_current_user)
):
    """Get classes for current user (taught or enrolled)"""
    if current_user.role.name == "TEACHER":
        return {"classes": current_user.taught_classes}
    else:
        return {"classes": current_user.enrolled_classes}