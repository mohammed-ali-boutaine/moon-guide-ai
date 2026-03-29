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
    def get_platform_analytics(db: DBSession) -> dict:
        """Return platform-wide quiz and learning analytics."""
        from sqlalchemy import case, select, func as sqlfunc
        from app.models.quiz import Quiz
        from app.models.quiz_attempt import QuizAttempt, AttemptStatus

        total_quizzes = db.scalar(select(sqlfunc.count()).select_from(Quiz)) or 0

        stats = db.execute(
            select(
                sqlfunc.count(QuizAttempt.id).label("total_attempts"),
                sqlfunc.avg(QuizAttempt.score).label("avg_score"),
                sqlfunc.sum(
                    case((QuizAttempt.score >= 90, 1), else_=0)
                ).label("excellent"),
                sqlfunc.sum(
                    case(((QuizAttempt.score >= 75) & (QuizAttempt.score < 90), 1), else_=0)
                ).label("good"),
                sqlfunc.sum(
                    case(((QuizAttempt.score >= 50) & (QuizAttempt.score < 75), 1), else_=0)
                ).label("average"),
                sqlfunc.sum(
                    case((QuizAttempt.score < 50, 1), else_=0)
                ).label("below_average"),
            ).where(
                QuizAttempt.status == AttemptStatus.submitted,
                QuizAttempt.score.is_not(None),
            )
        ).first()

        return {
            "total_quizzes": total_quizzes,
            "total_attempts": stats.total_attempts or 0,
            "avg_score": round(float(stats.avg_score), 1) if stats.avg_score is not None else None,
            "score_distribution": {
                "excellent": int(stats.excellent or 0),
                "good": int(stats.good or 0),
                "average": int(stats.average or 0),
                "below_average": int(stats.below_average or 0),
            },
        }

    @staticmethod
    def list_all_classes(
        db: DBSession,
        page: int,
        page_size: int,
        search: str | None,
    ) -> dict:
        """Return a paginated list of all classes."""
        q = db.query(Class)
        if search:
            q = q.filter(Class.name.ilike(f"%{search}%"))
        total = q.count()
        classes = (
            q.order_by(Class.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        items = []
        for c in classes:
            items.append({
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "teacher_id": str(c.teacher_id),
                "teacher_name": (
                    f"{c.teacher.profile.first_name} {c.teacher.profile.last_name}"
                    if c.teacher and c.teacher.profile else ""
                ),
                "teacher_email": c.teacher.email if c.teacher else "",
                "student_count": len(c.class_students),
                "created_at": c.created_at.isoformat(),
            })
        return {"total": total, "page": page, "page_size": page_size, "items": items}

    @staticmethod
    def delete_class(db: DBSession, class_id: str) -> None:
        """Delete a class by id (admin override)."""
        try:
            cid = _uuid.UUID(class_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid class id")
        cls = db.query(Class).filter(Class.id == cid).first()
        if not cls:
            raise HTTPException(status_code=404, detail="Class not found")
        db.delete(cls)
        db.commit()

    @staticmethod
    def list_all_documents(
        db: DBSession,
        page: int,
        page_size: int,
        status_filter: str | None,
    ) -> dict:
        """Return a paginated list of all documents."""
        from app.models.document import Document, StatusEnum
        q = db.query(Document).filter(Document.deleted_at.is_(None))
        if status_filter:
            try:
                q = q.filter(Document.status == StatusEnum(status_filter))
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")
        total = q.count()
        docs = (
            q.order_by(Document.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        items = []
        for d in docs:
            uploader = db.query(User).filter(User.id == d.uploaded_by_id).first()
            items.append({
                "id": d.id,
                "filename": d.filename,
                "file_type": d.file_type.value if d.file_type else None,
                "status": d.status.value if d.status else None,
                "scope": d.scope.value if d.scope else None,
                "class_id": str(d.class_id) if d.class_id else None,
                "uploaded_by_role": d.uploaded_by_role.value if d.uploaded_by_role else None,
                "uploader_email": uploader.email if uploader else None,
                "file_size_bytes": d.file_size_bytes,
                "created_at": d.created_at.isoformat(),
            })
        return {"total": total, "page": page, "page_size": page_size, "items": items}

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
