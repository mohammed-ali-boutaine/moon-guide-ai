# app/schemas/admin_schema.py
from typing import Optional
from pydantic import BaseModel, EmailStr


class CreateAdminRequest(BaseModel):
    """Request schema for creating an admin user."""

    email: EmailStr
    password: str
    first_name: str
    last_name: str


class UserAdminResponse(BaseModel):
    """Admin view of a user record."""

    id: str
    email: str
    role: Optional[str] = None
    is_active: bool
    created_at: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PaginatedUsersResponse(BaseModel):
    """Paginated list of users for admin."""

    total: int
    page: int
    page_size: int
    items: list[UserAdminResponse]


class ToggleActiveResponse(BaseModel):
    """Response after toggling a user's active status."""

    id: str
    is_active: bool


class PlatformStatsResponse(BaseModel):
    """Platform-wide statistics."""

    total_users: int
    students: int
    teachers: int
    admins: int
    total_classes: int
    active_sessions: int
