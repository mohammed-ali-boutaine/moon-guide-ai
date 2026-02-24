import logging
from datetime import datetime, timedelta, timezone
from typing import Optional,Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging import logger



logger = logging.getLogger(__name__)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
if not SECRET_KEY:
    logger.error(
        "SECRET_KEY environment variable is not set. Please set it before running the application."
    )
    raise ValueError("SECRET_KEY environment variable must be set")


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    payload = {
        "sub": str(data.get("sub")),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }
        
    try:
        encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        logger.debug("Access token created successfully")
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {str(e)}")
        raise


def verify_token(token: str):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            logger.warning("Invalid token type")
            return None
        
        logger.debug("Token verified successfully")
        return payload
    except JWTError as e:
        logger.warning(f"Token verification failed: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        return None


def verify_password(plain_password: str, hashed_password: str):
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str):
    """Generate password hash"""
    return pwd_context.hash(password)
