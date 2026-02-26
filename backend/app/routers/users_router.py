# app/api/routes/users.py
import shutil
import time
import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.dependencies import get_current_user
from app.models.user import User
from sqlalchemy.orm import Session
import os
from app.core.security import (
    hash_password,
    verify_password,
)
from app.schemas.auth import UserProfileUpdate
from app.core.database import get_db


router = APIRouter(prefix="/api/users", tags=["users"])

# Ensure this directory exists
UPLOAD_DIR = "static/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.patch("/me/avatar")
async def upload_avatar(
    file : UploadFile = File(...),
    db :Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    """Upload avatar for current user"""
    # validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and GIF are allowed.")

    # generate unique file name
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{current_user.id}_{int(time.time())}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # save file to lcoal storage
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    #  store the URL/Path string in the avatar_url column
    static_url = f"/static/avatars/{unique_filename}"
    current_user.profile.avatar_url = static_url
    
    db.commit()
    db.refresh(current_user)

    return {"avatar_url": static_url}

@router.put("/me")
async def update_current_user_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile"""
    if current_user.profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update name fields if provided
    if profile_data.first_name is not None:
        current_user.profile.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        current_user.profile.last_name = profile_data.last_name
    if profile_data.display_name is not None:
        current_user.profile.display_name = profile_data.display_name

    # Change password: verify old password first
    if profile_data.new_password is not None:
        if not profile_data.old_password:
            raise HTTPException(status_code=400, detail="Old password is required to set a new password")
        if not verify_password(profile_data.old_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.password_hash = hash_password(profile_data.new_password)

    db.commit()
    db.refresh(current_user)

    return {
        "status": 200,
        "message": "Profile updated successfully",
        "profile": {
            "first_name": current_user.profile.first_name,
            "last_name": current_user.profile.last_name,
            "avatar_url": current_user.profile.avatar_url,
        },
    }

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