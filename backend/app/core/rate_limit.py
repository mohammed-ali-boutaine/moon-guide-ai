"""
core/rate_limit.py

Reusable Redis-based rate limiting for FastAPI endpoints.

Usage:
    from app.core.rate_limit import RateLimiter

    @router.post("/expensive")
    def expensive_endpoint(
        current_user: CurrentUser,
        _: Annotated[None, Depends(RateLimiter("quiz_gen", max_requests=5, window_seconds=60))],
    ):
        ...
"""
from __future__ import annotations

from fastapi import HTTPException, status

from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.redis_client import redis_client


class RateLimiter:
    """Dependency that enforces per-user rate limits via Redis counters."""

    def __init__(self, name: str, max_requests: int, window_seconds: int) -> None:
        self.name = name
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    def __call__(self, current_user: CurrentUser) -> None:
        key = f"rl:{self.name}:{current_user.id}"
        try:
            count = redis_client.incr(key)
            if count == 1:
                redis_client.expire(key, self.window_seconds)
            if count > self.max_requests:
                ttl = max(redis_client.ttl(key), 1)
                logger.warning(
                    "Rate limit hit: user=%s endpoint=%s count=%d limit=%d",
                    current_user.id, self.name, count, self.max_requests,
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {ttl}s.",
                    headers={"Retry-After": str(ttl)},
                )
        except HTTPException:
            raise
        except Exception as exc:
            # If Redis is down, allow the request but log
            logger.error("Rate limiter Redis error: %s", exc)
