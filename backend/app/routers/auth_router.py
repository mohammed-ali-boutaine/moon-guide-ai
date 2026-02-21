# app/api/routes/auth.py
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
    hash_password
)
from app.models.session import Session
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    AccessTokenResponse,
)

from app.core.dependencies import get_current_user
from app.models.user_profile import UserProfile
from app.models.role import Role
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["authentication"])


# app/api/routes/auth.py
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.logging import logger
from app.core.security import hash_password, create_access_token, create_refresh_token, REFRESH_TOKEN_EXPIRE_DAYS
from app.models.role import Role, RoleName
from app.models.session import Session
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    AccessTokenResponse,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: RegisterRequest,
    db: DBSession = Depends(get_db)
):
    """
    Register a new user account
    Creates user, profile, and returns access/refresh tokens
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        logger.warning(f"Registration attempt with existing email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Get or create role
    role = db.query(Role).filter(Role.name == user_data.role).first()
    if not role:
        logger.error(f"Role not found: {user_data.role}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
    
    try:
        # Create user
        new_user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            role_id=role.id,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # Flush to get user.id
        
        # Create user profile
        profile = UserProfile(
            user_id=new_user.id,
            first_name=user_data.first_name,
            last_name=user_data.last_name
        )
        db.add(profile)
        
        # Generate tokens
        access_token = create_access_token(new_user.id)
        refresh_token = create_refresh_token()
        
        # Create session
        session = Session(
            user_id=new_user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(session)
        
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.email} with role {user_data.role}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: DBSession = Depends(get_db)
):
    """
    Login with email and password
    Returns access token (JWT) and refresh token
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        logger.warning(f"Login attempt with non-existent email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Failed login attempt for user: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        logger.warning(f"Inactive user attempted login: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token()
    
    # Create session record
    session = Session(
        user_id=user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    db.add(session)
    db.commit()
    
    logger.info(f"User logged in: {user.email}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: DBSession = Depends(get_db)
):
    """
    Get a new access token using refresh token
    """
    # Find session by refresh token
    session = db.query(Session).filter(
        Session.refresh_token == request.refresh_token,
        Session.revoked_at.is_(None),
        Session.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not session:
        logger.warning("Invalid or expired refresh token used")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Check if user is still active
    if not session.user.is_active:
        logger.warning(f"Inactive user attempted token refresh: {session.user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Generate new access token
    new_access_token = create_access_token(session.user_id)
    
    # Update session with new access token
    session.access_token = new_access_token
    db.commit()
    
    logger.info(f"Access token refreshed for user: {session.user.email}")
    
    return AccessTokenResponse(access_token=new_access_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    request: RefreshTokenRequest,
    db: DBSession = Depends(get_db)
):
    """
    Logout by revoking the session
    """
    session = db.query(Session).filter(
        Session.refresh_token == request.refresh_token
    ).first()
    
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"User logged out: {session.user.email}")
    
    return {"message": "Successfully logged out"}


@router.post("/logout-all", status_code=status.HTTP_200_OK)
async def logout_all_sessions(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Logout from all devices by revoking all user sessions
    """
    revoked_count = db.query(Session).filter(
        Session.user_id == current_user.id,
        Session.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})
    
    db.commit()
    
    logger.info(f"User logged out from all devices: {current_user.email} ({revoked_count} sessions)")
    
    return {"message": f"Successfully logged out from {revoked_count} device(s)"}