from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import logger
from app.models.role import RoleName
from app.models.user import User
from app.utils.jwt import verify_token

# This is a placeholder - replace with your actual JWT verification logic
security = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """
    Get current authenticated user from JWT token
    """
    try:
        # Verify token
        payload = verify_token(credentials.credentials)
        if payload is None:
            logger.warning("Invalid token received")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
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

    Usage:
        @app.get("/teacher-only")
        async def teacher_endpoint(user: Annotated[User, Depends(require_role([RoleName.TEACHER]))]):
            ...
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
