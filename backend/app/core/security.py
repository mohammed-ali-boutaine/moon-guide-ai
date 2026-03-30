# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt
from passlib.context import CryptContext
import secrets
from app.core.config import settings
from app.core.logging import logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password (truncated to 72 bytes for bcrypt compatibility)"""
    # bcrypt has a 72-byte limit on password length
    password_truncated = password[:72] if isinstance(password, str) else password
    return pwd_context.hash(password_truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (truncated to 72 bytes for bcrypt compatibility)"""
    # bcrypt has a 72-byte limit on password length
    password_truncated = plain_password[:72] if isinstance(plain_password, str) else plain_password
    return pwd_context.verify(password_truncated, hashed_password)


def create_access_token(user_id: str, expires_delta: timedelta | None = None) -> str:
    """Generate JWT access token"""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": secrets.token_hex(16),
        "type": "access"
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token() -> str:
    """Generate secure random refresh token"""
    return secrets.token_urlsafe(64)


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify and decode JWT access token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        return payload
    except ValueError as e:
        raise ValueError(str(e))
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}")
    
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS