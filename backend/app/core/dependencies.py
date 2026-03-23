# app/core/dependencies.py
from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.core.database import get_db
from app.core.logging import logger
from app.models.role import RoleName
from app.models.session import Session
from app.models.user import User
from app.utils.jwt import verify_token

# auto_error=False allows fallback to cookie-based auth
security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    db: Annotated[DBSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)] = None,
) -> User:
    """
    Dependency to get current authenticated user.
    Reads access token from:
    1. httpOnly cookie (browser clients)
    2. Authorization: Bearer header (API clients / tests)
    """
    try:
        # 1. Try cookie first
        token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
        # 2. Fall back to Bearer header
        if not token and credentials:
            token = credentials.credentials
        # 3. No token found
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        # Verify JWT token
        payload = verify_token(token)
        if payload is None:
            logger.warning("Invalid token received")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        # Get user ID from token
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            logger.warning("Token missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        # Convert string UUID to UUID object
        try:
            user_id = UUID(user_id_str)
        except (ValueError, TypeError) as err:
            logger.warning(f"Invalid UUID format in token: {user_id_str}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            ) from err

        # Verify session exists and is valid (MOVED HERE)
        session = db.query(Session).filter(
            Session.access_token == token,
            Session.revoked_at.is_(None)
        ).first()
        
        if not session:
            logger.warning(f"Session not found or revoked for user: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session not found or has been revoked",
            )

        # Fetch user from database
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            logger.warning(f"User not found for ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        logger.info(f"User authenticated: {user.email}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        ) from e


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Verify that the current user is active
    """
    if not current_user.is_active:
        logger.warning(f"Inactive user attempted access: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def require_role(allowed_roles: list[RoleName]):
    """
    Dependency factory to check if user has required role
    """
    def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ) -> User:
        if not current_user.role:
            logger.warning(f"User with no role attempted access: {current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no role assigned",
            )

        if current_user.role.name not in allowed_roles:
            logger.warning(
                f"User {current_user.email} with role {current_user.role.name} "
                f"attempted to access resource requiring {[role.value for role in allowed_roles]}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[role.value for role in allowed_roles]}",
            )

        return current_user

    return role_checker


# Type aliases for cleaner endpoint signatures
CurrentUser = Annotated[User, Depends(get_current_active_user)]
TeacherUser = Annotated[User, Depends(require_role([RoleName.TEACHER]))]
StudentUser = Annotated[User, Depends(require_role([RoleName.STUDENT]))]
AdminUser = Annotated[User, Depends(require_role([RoleName.ADMIN]))]