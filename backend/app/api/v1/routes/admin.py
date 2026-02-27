# app/api/v1/routes/admin.py
"""
Admin routes — validate input → call AdminService → return response.
Only accessible by users with the ADMIN role.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.role import RoleName
from app.models.user import User
from app.schemas.admin_schema import CreateAdminRequest
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Auth guard ──────────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name != RoleName.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ── Routes ──────────────────────────────────────────────────────────────────

@router.get("/users", summary="List all users")
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role: STUDENT, TEACHER, ADMIN"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Return a paginated list of all users. Optionally filter by role."""
    return AdminService.list_users(db, role, page, page_size)


@router.post(
    "/users/admin",
    status_code=status.HTTP_201_CREATED,
    summary="Create an admin user",
)
async def create_admin_user(
    data: CreateAdminRequest,
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Create a new user with the ADMIN role."""
    return AdminService.create_admin(db, data)


@router.patch(
    "/users/{user_id}/toggle-active",
    summary="Toggle user active status",
)
async def toggle_user_active(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Activate or deactivate a user account."""
    return AdminService.toggle_user_active(db, user_id)


@router.get("/stats", summary="Platform statistics")
async def get_stats(
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Return counts of users, classes, and active sessions."""
    return AdminService.get_stats(db)


@router.get("/users/export", summary="Export users as CSV")
async def export_users_csv(
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Stream all users as a downloadable CSV file."""
    return AdminService.export_users_csv(db)
