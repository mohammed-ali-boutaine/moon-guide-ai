# app/schemas/user_schema.py
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserProfileResponse(BaseModel):
    """Response schema for user profile data."""

    id: UUID
    email: str
    is_active: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AvatarUploadResponse(BaseModel):
    """Response after a successful avatar upload."""

    avatar_url: str


class ProfileUpdateResponse(BaseModel):
    """Response after a successful profile update."""

    status: int
    message: str
    profile: dict
