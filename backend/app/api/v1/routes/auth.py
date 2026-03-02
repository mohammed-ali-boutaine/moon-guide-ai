# app/api/v1/routes/auth.py
"""
Auth routes — validate input → call AuthService → return response.
"""
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.google import GoogleSSO
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.logging import logger
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])

# ── Google SSO setup ────────────────────────────────────────────────────────

_redirect_url = f"{settings.BACKEND_URL}/api/auth/google/callback"
sso = GoogleSSO(
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    redirect_uri=_redirect_url,
)


# ── Cookie helpers ──────────────────────────────────────────────────────────

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
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
    response.delete_cookie(key=settings.ACCESS_TOKEN_COOKIE_NAME, samesite=settings.COOKIE_SAMESITE)
    response.delete_cookie(key=settings.REFRESH_TOKEN_COOKIE_NAME, samesite=settings.COOKIE_SAMESITE)


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    user_data: RegisterRequest,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """Register a new user. Sets httpOnly auth cookies and returns tokens."""
    access_token, refresh_token = AuthService.register(db, user_data)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse, summary="Login with email/password")
async def login(
    credentials: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """Authenticate with email and password. Sets httpOnly auth cookies."""
    access_token, refresh_token = AuthService.login(db, credentials, request)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/google/login", summary="Redirect to Google OAuth2")
async def google_login():
    """Redirect the user to the Google OAuth consent screen."""
    return await sso.get_login_redirect()


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(request: Request, db: DBSession = Depends(get_db)):
    """Handle the Google OAuth callback, create/login user, redirect to frontend."""
    try:
        google_user = await sso.verify_and_process(request)

        if not google_user:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=google_auth_failed",
                status_code=302,
            )

        access_token, refresh_token = AuthService.handle_google_user(db, google_user)

        redirect_response = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback",
            status_code=302,
        )
        _set_auth_cookies(redirect_response, access_token, refresh_token)
        return redirect_response

    except Exception as e:
        logger.error(f"OAuth Callback Error: {str(e)}", exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=server_error",
            status_code=302,
        )


@router.post("/refresh", response_model=AccessTokenResponse, summary="Refresh access token")
async def refresh_access_token(
    http_request: Request,
    response: Response,
    db: DBSession = Depends(get_db),
    body: RefreshTokenRequest = None,
):
    """
    Issue a new access token using a valid refresh token.
    Reads the token from the httpOnly cookie (browsers) or the request body (API clients).
    """
    refresh_token_value = http_request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_value and body:
        refresh_token_value = body.refresh_token

    if not refresh_token_value:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
        )

    new_access_token = AuthService.refresh_access_token(db, refresh_token_value)

    response.set_cookie(
        key=settings.ACCESS_TOKEN_COOKIE_NAME,
        value=new_access_token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return AccessTokenResponse(access_token=new_access_token)


@router.post("/logout", status_code=status.HTTP_200_OK, summary="Logout current session")
async def logout(
    req: Request,
    response: Response,
    db: DBSession = Depends(get_db),
    body: RefreshTokenRequest = None,
):
    """
    Revoke the current session.
    Reads the refresh token from the httpOnly cookie or request body.
    """
    refresh_token_value = req.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_value and body:
        refresh_token_value = body.refresh_token

    AuthService.logout(db, refresh_token_value, req)
    _clear_auth_cookies(response)
    return {"message": "Successfully logged out"}


@router.post(
    "/logout-all",
    status_code=status.HTTP_200_OK,
    summary="Logout from all devices",
)
async def logout_all_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Revoke all active sessions for the current user."""
    revoked_count = AuthService.logout_all(db, current_user.id, request)
    return {"message": f"Successfully logged out from {revoked_count} device(s)"}
