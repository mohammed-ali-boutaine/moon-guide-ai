"""
Admin-only API endpoints: user management, statistics, data export.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import hash_password
from app.models.role import Role, RoleName
from app.models.session import Session
from app.models.user import User
from app.models.user_profile import UserProfile

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Auth guard ───────────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name != RoleName.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str


# ── Helpers ──────────────────────────────────────────────────────────────────

def _user_dict(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "role": u.role.name.value if u.role else None,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat(),
        "first_name": u.profile.first_name if u.profile else None,
        "last_name": u.profile.last_name if u.profile else None,
        "avatar_url": u.profile.avatar_url if u.profile else None,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role: STUDENT, TEACHER, ADMIN"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """List all users with optional role filter and pagination."""
    q = db.query(User)
    if role:
        try:
            role_enum = RoleName(role.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
        q = q.join(User.role).filter(Role.name == role_enum)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_user_dict(u) for u in users],
    }


@router.post("/users/admin", status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    data: CreateAdminRequest,
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Create a new admin user."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_role = db.query(Role).filter(Role.name == RoleName.ADMIN).first()
    if not admin_role:
        raise HTTPException(status_code=500, detail="ADMIN role not found")

    new_user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    profile = UserProfile(
        user_id=new_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    db.add(profile)
    db.commit()
    db.refresh(new_user)

    return _user_dict(new_user)


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Toggle a user's active status."""
    import uuid as _uuid
    try:
        uid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")

    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()
    return {"id": str(user.id), "is_active": user.is_active}


@router.get("/stats")
async def get_stats(
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Return platform statistics."""
    from app.models.class_ import Class

    def count_role(role_name: RoleName) -> int:
        return db.query(User).join(User.role).filter(Role.name == role_name).count()

    return {
        "total_users": db.query(User).count(),
        "students": count_role(RoleName.STUDENT),
        "teachers": count_role(RoleName.TEACHER),
        "admins": count_role(RoleName.ADMIN),
        "total_classes": db.query(Class).count(),
        "active_sessions": db.query(Session).filter(Session.revoked_at.is_(None)).count(),
    }


@router.get("/users/export")
async def export_users_csv(
    _admin: User = Depends(require_admin),
    db: DBSession = Depends(get_db),
):
    """Export all users as a CSV file."""
    users = db.query(User).order_by(User.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["id", "email", "role", "is_active", "first_name", "last_name", "created_at"],
    )
    writer.writeheader()
    for u in users:
        writer.writerow({
            "id": str(u.id),
            "email": u.email,
            "role": u.role.name.value if u.role else "",
            "is_active": u.is_active,
            "first_name": u.profile.first_name if u.profile else "",
            "last_name": u.profile.last_name if u.profile else "",
            "created_at": u.created_at.isoformat(),
        })

    output.seek(0)
    filename = f"users_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
