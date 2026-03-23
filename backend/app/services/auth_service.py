# app/services/auth_service.py
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.core.logging import logger
from app.core.security import (
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.role import Role, RoleName
from app.models.session import Session
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
)


class AuthService:
    """Business logic for authentication operations."""

    @staticmethod
    def register(
        db: DBSession, user_data: RegisterRequest
    ) -> tuple[str, str]:
        """
        Register a new user.

        Returns:
            Tuple of (access_token, refresh_token)
        """
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            logger.warning(f"Registration attempt with existing email: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        role = db.query(Role).filter(Role.name == user_data.role).first()
        if not role:
            logger.error(f"Role not found: {user_data.role}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role",
            )

        try:
            new_user = User(
                email=user_data.email,
                password_hash=hash_password(user_data.password),
                role_id=role.id,
                is_active=True,
            )
            db.add(new_user)
            db.flush()

            profile = UserProfile(
                user_id=new_user.id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
            )
            db.add(profile)

            access_token = create_access_token(new_user.id)
            refresh_token = create_refresh_token()

            session = Session(
                user_id=new_user.id,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            )
            db.add(session)
            db.commit()
            db.refresh(new_user)

            logger.info(f"New user registered: {new_user.email} with role {user_data.role}")
            return access_token, refresh_token

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account",
            )

    @staticmethod
    def login(
        db: DBSession, credentials: LoginRequest, request=None
    ) -> tuple[str, str]:
        """
        Authenticate a user with email/password.

        Returns:
            Tuple of (access_token, refresh_token)
        """
        user = db.query(User).filter(User.email == credentials.email).first()

        if not user:
            logger.warning(f"Login attempt with non-existent email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if user.password_hash is None:
            logger.warning(f"Password login attempted on OAuth-only account: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google Login. Please sign in with Google.",
            )

        if not verify_password(credentials.password, user.password_hash):
            logger.warning(f"Failed login attempt for user: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not user.is_active:
            logger.warning(f"Inactive user attempted login: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token()

        session = Session(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(session)
        db.commit()

        from app.services.activity_service import ActivityService
        ActivityService.log_activity(db, user.id, "login", request)

        logger.info(f"User logged in: {user.email}")
        return access_token, refresh_token

    @staticmethod
    def handle_google_user(db: DBSession, google_user) -> tuple[str, str]:
        """
        Create or find a user from a Google OAuth profile.

        Returns:
            Tuple of (access_token, refresh_token)
        """
        user = db.query(User).filter(User.email == google_user.email).first()

        if not user:
            default_role = db.query(Role).filter(Role.name == RoleName.STUDENT).first()
            user = User(
                email=google_user.email,
                password_hash=None,
                role_id=default_role.id,
                is_active=True,
            )
            db.add(user)
            db.flush()

            profile = UserProfile(
                user_id=user.id,
                first_name=google_user.first_name,
                last_name=google_user.last_name,
            )
            db.add(profile)
            logger.info(f"New user registered via Google: {user.email}")

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token()

        new_session = Session(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(new_session)
        db.commit()

        return access_token, refresh_token

    @staticmethod
    def refresh_access_token(db: DBSession, refresh_token_value: str) -> str:
        """
        Issue a new access token from a valid refresh token.

        Returns:
            New access_token string
        """
        session = (
            db.query(Session)
            .filter(
                Session.refresh_token == refresh_token_value,
                Session.revoked_at.is_(None),
                Session.expires_at > datetime.now(timezone.utc),
            )
            .first()
        )

        if not session:
            logger.warning("Invalid or expired refresh token used")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        if not session.user.is_active:
            logger.warning(f"Inactive user attempted token refresh: {session.user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        new_access_token = create_access_token(session.user_id)
        session.access_token = new_access_token
        db.commit()

        logger.info(f"Access token refreshed for user: {session.user.email}")
        return new_access_token

    @staticmethod
    def logout(db: DBSession, refresh_token_value: str | None, request: Request = None) -> None:
        """Revoke the session associated with the given refresh token."""
        if not refresh_token_value:
            return

        session = (
            db.query(Session)
            .filter(Session.refresh_token == refresh_token_value)
            .first()
        )
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
            from app.services.activity_service import ActivityService
            ActivityService.log_activity(db, session.user_id, "logout", request)
            logger.info(f"User logged out: {session.user.email}")

    @staticmethod
    def logout_all(db: DBSession, user_id, request: Request = None) -> int:
        """
        Revoke all active sessions for the given user.

        Returns:
            Number of sessions revoked.
        """
        revoked_count = (
            db.query(Session)
            .filter(Session.user_id == user_id, Session.revoked_at.is_(None))
            .update({"revoked_at": datetime.now(timezone.utc)})
        )
        db.commit()
        from app.services.activity_service import ActivityService
        ActivityService.log_activity(db, user_id, "logout_all", request)
        return revoked_count
