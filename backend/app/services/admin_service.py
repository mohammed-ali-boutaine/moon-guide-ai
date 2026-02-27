# app/services/admin_service.py
import csv
import io
import uuid as _uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from app.core.logging import logger
from app.core.security import hash_password
from app.models.class_ import Class
from app.models.role import Role, RoleName
from app.models.session import Session
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.admin_schema import CreateAdminRequest


def _user_dict(u: User) -> dict:
    """Serialize a User ORM object to a plain dict."""
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


class AdminService:
    """Business logic for admin operations."""

    @staticmethod
    def list_users(
        db: DBSession,
        role: str | None,
        page: int,
        page_size: int,
    ) -> dict:
        """Return a paginated list of all users, optionally filtered by role."""
        q = db.query(User)
        if role:
            try:
                role_enum = RoleName(role.upper())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
            q = q.join(User.role).filter(Role.name == role_enum)

        total = q.count()
        users = (
            q.order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [_user_dict(u) for u in users],
        }

    @staticmethod
    def create_admin(db: DBSession, data: CreateAdminRequest) -> dict:
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

        logger.info(f"Admin user created: {new_user.email}")
        return _user_dict(new_user)

    @staticmethod
    def toggle_user_active(db: DBSession, user_id: str) -> dict:
        """Toggle the is_active flag of a user."""
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

    @staticmethod
    def get_stats(db: DBSession) -> dict:
        """Return platform-wide statistics."""

        def count_role(role_name: RoleName) -> int:
            return (
                db.query(User).join(User.role).filter(Role.name == role_name).count()
            )

        return {
            "total_users": db.query(User).count(),
            "students": count_role(RoleName.STUDENT),
            "teachers": count_role(RoleName.TEACHER),
            "admins": count_role(RoleName.ADMIN),
            "total_classes": db.query(Class).count(),
            "active_sessions": db.query(Session)
            .filter(Session.revoked_at.is_(None))
            .count(),
        }

    @staticmethod
    def export_users_csv(db: DBSession) -> StreamingResponse:
        """Stream all users as a CSV file."""
        users = db.query(User).order_by(User.created_at.desc()).all()

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "id",
                "email",
                "role",
                "is_active",
                "first_name",
                "last_name",
                "created_at",
            ],
        )
        writer.writeheader()
        for u in users:
            writer.writerow(
                {
                    "id": str(u.id),
                    "email": u.email,
                    "role": u.role.name.value if u.role else "",
                    "is_active": u.is_active,
                    "first_name": u.profile.first_name if u.profile else "",
                    "last_name": u.profile.last_name if u.profile else "",
                    "created_at": u.created_at.isoformat(),
                }
            )

        output.seek(0)
        filename = f"users_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
