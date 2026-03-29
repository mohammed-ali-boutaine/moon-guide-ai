"""
routes/career.py

Career orientation prediction endpoint.
  POST /career/predict  – predict career from student profile
  GET  /career/status   – check if model is loaded
  GET  /career/careers   – list available career labels
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import CurrentUser
from app.core.rate_limit import RateLimiter
from app.schemas.career import (
    CareerPrediction,
    CareerPredictionResponse,
    CareerProfileRequest,
)
from app.services import career_service

router = APIRouter(prefix="/career", tags=["Career Orientation"])

_rate_limit_predict = RateLimiter("career_predict", max_requests=15, window_seconds=60)


@router.post(
    "/predict",
    response_model=CareerPredictionResponse,
    summary="Predict career orientation from a student profile",
)
def career_predict(
    body: CareerProfileRequest,
    current_user: CurrentUser,
    _: Annotated[None, Depends(_rate_limit_predict)],
) -> CareerPredictionResponse:
    """
    Submit a student profile and receive the top-3 career predictions
    with confidence percentages.
    """
    if not career_service.is_model_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Career prediction model is not available. Contact an administrator.",
        )

    profile_dict = {
        "skills": body.skills,
        "interests": body.interests,
        "academic_performance": body.academic_performance.model_dump(),
        "projects": body.projects,
        "goals": body.goals.model_dump(),
    }

    try:
        result = career_service.predict_career(profile_dict)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {exc}",
        ) from exc

    return CareerPredictionResponse(
        top_prediction=result["top_prediction"],
        recommendations=[
            CareerPrediction(label=r["label"], confidence=r["confidence"])
            for r in result["recommendations"]
        ],
    )


@router.get(
    "/status",
    summary="Check if the career model is available",
)
def career_status(current_user: CurrentUser):
    available = career_service.is_model_available()
    careers = career_service.get_available_careers() if available else []
    return {
        "model_available": available,
        "careers": careers,
    }


@router.get(
    "/careers",
    response_model=list[str],
    summary="List available career labels",
)
def list_careers(current_user: CurrentUser) -> list[str]:
    return career_service.get_available_careers()
