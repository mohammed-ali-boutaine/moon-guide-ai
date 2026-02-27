# app/routers/auth_router.py
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DBSession
from fastapi_sso.sso.google import GoogleSSO

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
    hash_password,
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
from app.models.role import Role, RoleName
from app.core.logging import logger
from app.routers.activity_router import log_activity

# ── Google SSO ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET

redirect_url = f"{settings.BACKEND_URL}/api/auth/google/callback"
sso = GoogleSSO(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    redirect_uri=redirect_url,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ── Cookie helpers ───────────────────────────────────────────────────────────

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set httpOnly cookies for access and refresh tokens."""
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Remove auth cookies."""
    response.delete_cookie(key=settings.ACCESS_TOKEN_COOKIE_NAME, samesite=settings.COOKIE_SAMESITE)
    response.delete_cookie(key=settings.REFRESH_TOKEN_COOKIE_NAME, samesite=settings.COOKIE_SAMESITE)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: RegisterRequest,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """
    Register a new user account.
    Sets access_token and refresh_token as httpOnly cookies.
    Also returns tokens in JSON body for API/test clients.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        logger.warning(f"Registration attempt with existing email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Get or create role
    role = db.query(Role).filter(Role.name == user_data.role).first()
    if not role:
        logger.error(f"Role not found: {user_data.role}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )

    try:
        # Create user
        new_user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            role_id=role.id,
            is_active=True,
        )
        db.add(new_user)
        db.flush()  # Flush to get user.id

        # Create user profile
        profile = UserProfile(
            user_id=new_user.id,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
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
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(session)
        db.commit()
        db.refresh(new_user)

        logger.info(f"New user registered: {new_user.email} with role {user_data.role}")

        # Set httpOnly cookies
        _set_auth_cookies(response, access_token, refresh_token)

        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account",
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """
    Login with email and password.
    Sets access_token and refresh_token as httpOnly cookies.
    Also returns tokens in JSON body for API/test clients.
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        logger.warning(f"Login attempt with non-existent email: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Block password login for Google-only accounts
    if user.password_hash is None:
        logger.warning(f"Password login attempted on OAuth-only account: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Login. Please sign in with Google.",
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
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    log_activity(db, user.id, "login", request)

    logger.info(f"User logged in: {user.email}")

    # Set httpOnly cookies
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ── Google SSO ───────────────────────────────────────────────────────────────


@router.get("/google/login")
async def google_login():
    """Redirects user to Google OAuth2 page"""
    async with sso:
        return await sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: DBSession = Depends(get_db)):
    """Handles the return from Google, creates user if not exists, and redirects with tokens"""

    try:
        async with sso:
            google_user = await sso.verify_and_process(request)
        
        if not google_user:
            error_url = f"{settings.FRONTEND_URL}/login?error=google_auth_failed"
            return RedirectResponse(url=error_url, status_code=302)

        # 1. Check if user already exists
        user = db.query(User).filter(User.email == google_user.email).first()

        if not user:
            # 2. Register new user automatically if they don't exist
            # Default to a 'user' role (adjust based on your Role model)
            default_role = db.query(Role).filter(Role.name == RoleName.STUDENT).first() 
            
            user = User(
                email=google_user.email,
                password_hash=None,  # Google users don't have a local password
                role_id=default_role.id,
                is_active=True
            )
            db.add(user)
            db.flush()

            profile = UserProfile(
                user_id=user.id,
                first_name=google_user.first_name,
                last_name=google_user.last_name,
                # google_user.picture can be saved here if your profile model supports it
            )
            db.add(profile)
            logger.info(f"New user registered via Google: {user.email}")
        
        # 3. Check if user is active (standard check)
        if not user.is_active:
            error_url = f"{settings.FRONTEND_URL}/login?error=account_inactive"
            return RedirectResponse(url=error_url, status_code=302)

        # 4. Generate tokens using your existing core logic
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token()

        # 5. Create session (Standardizing with your /login flow)
        new_session = Session(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(new_session)
        db.commit()

        # 6. Redirect to frontend – tokens are set as httpOnly cookies (not in URL)
        redirect_response = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback",
            status_code=302,
        )
        _set_auth_cookies(redirect_response, access_token, refresh_token)
        return redirect_response

    except Exception as e:
        logger.error(f"OAuth Callback Error: {str(e)}", exc_info=True)
        error_url = f"{settings.FRONTEND_URL}/login?error=server_error"
        return RedirectResponse(url=error_url, status_code=302)




@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_access_token(
    http_request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
    body: RefreshTokenRequest = None,
):
    """
    Get a new access token using a refresh token.
    Reads refresh_token from httpOnly cookie (browser) or request body (API clients).
    Sets new access_token cookie.
    """
    # Cookie-first, fallback to body
    refresh_token_value = http_request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_value and body:
        refresh_token_value = body.refresh_token

    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
        )

    # Find session by refresh token
    session = db.query(Session).filter(
        Session.refresh_token == refresh_token_value,
        Session.revoked_at.is_(None),
        Session.expires_at > datetime.now(timezone.utc),
    ).first()

    if not session:
        logger.warning("Invalid or expired refresh token used")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Check if user is still active
    if not session.user.is_active:
        logger.warning(f"Inactive user attempted token refresh: {session.user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Generate new access token
    new_access_token = create_access_token(session.user_id)

    # Update session
    session.access_token = new_access_token
    db.commit()

    logger.info(f"Access token refreshed for user: {session.user.email}")

    # Set new access_token cookie
    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=new_access_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return AccessTokenResponse(access_token=new_access_token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    req: Request,
    response: Response,
    db: DBSession = Depends(get_db),
    body: RefreshTokenRequest = None,
):
    """
    Logout by revoking the session.
    Reads refresh_token from httpOnly cookie or request body.
    Clears auth cookies.
    """
    # Cookie-first, fallback to body
    refresh_token_value = req.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_value and body:
        refresh_token_value = body.refresh_token

    if refresh_token_value:
        session = db.query(Session).filter(
            Session.refresh_token == refresh_token_value,
        ).first()

        if session:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
            log_activity(db, session.user_id, "logout", req)
            logger.info(f"User logged out: {session.user.email}")

    _clear_auth_cookies(response)
    return {"message": "Successfully logged out"}


@router.post("/logout-all", status_code=status.HTTP_200_OK)
async def logout_all_sessions(
    request: Request,
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
    log_activity(db, current_user.id, "logout_all", request)
    
    logger.info(f"User logged out from all devices: {current_user.email} ({revoked_count} sessions)")
    
    return {"message": f"Successfully logged out from {revoked_count} device(s)"}