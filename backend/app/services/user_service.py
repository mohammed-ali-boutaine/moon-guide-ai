# app/services/user_service.py
import os
import shutil
import time

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session as DBSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserProfileUpdate

UPLOAD_DIR = "static/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


class UserService:
    """Business logic for user profile operations."""

    @staticmethod
    def get_profile(user: User) -> dict:
        """Return a serializable dict of the user's public profile."""
        return {
            "id": str(user.id),
            "email": user.email,
            "is_active": user.is_active,
            "role": user.role.name.value if user.role else None,
            "first_name": user.profile.first_name if user.profile else None,
            "last_name": user.profile.last_name if user.profile else None,
            "avatar_url": user.profile.avatar_url if user.profile else None,
        }

    @staticmethod
    def update_profile(
        db: DBSession, user: User, profile_data: UserProfileUpdate
    ) -> dict:
        """
        Update the current user's profile fields.

        Returns:
            Updated profile dict.
        """
        if user.profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        if profile_data.first_name is not None:
            user.profile.first_name = profile_data.first_name
        if profile_data.last_name is not None:
            user.profile.last_name = profile_data.last_name

        if profile_data.new_password is not None:
            if not profile_data.old_password:
                raise HTTPException(
                    status_code=400,
                    detail="Old password is required to set a new password",
                )
            if not verify_password(profile_data.old_password, user.password_hash):
                raise HTTPException(
                    status_code=400,
                    detail="Current password is incorrect",
                )
            user.password_hash = hash_password(profile_data.new_password)

        db.commit()
        db.refresh(user)

        return {
            "status": 200,
            "message": "Profile updated successfully",
            "profile": {
                "first_name": user.profile.first_name,
                "last_name": user.profile.last_name,
                "avatar_url": user.profile.avatar_url,
            },
        }

    @staticmethod
    def upload_avatar(db: DBSession, user: User, file: UploadFile) -> str:
        """
        Save an uploaded avatar image and persist the URL to the user profile.

        Returns:
            The public URL path of the saved avatar.
        """
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
            )

        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{user.id}_{int(time.time())}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        static_url = f"/static/avatars/{unique_filename}"
        user.profile.avatar_url = static_url
        db.commit()
        db.refresh(user)

        return static_url
