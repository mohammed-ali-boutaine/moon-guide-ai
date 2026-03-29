"""
schemas/career.py

Pydantic models for the career orientation prediction endpoint.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class AcademicPerformance(BaseModel):
    math: float = Field(..., ge=0, le=20)
    sciences: float = Field(..., ge=0, le=20)
    languages: float = Field(..., ge=0, le=20)
    arts: float = Field(..., ge=0, le=20)


class CareerGoals(BaseModel):
    salary_expectation: str = Field(..., examples=["35000", "60000"])
    remote_preference: str = Field(..., examples=["remote", "hybrid", "on-site"])
    target_field: str = Field(..., examples=["fintech", "healthcare", "gaming"])


class CareerProfileRequest(BaseModel):
    skills: list[str] = Field(..., min_length=1, max_length=15)
    interests: list[str] = Field(..., min_length=1, max_length=10)
    academic_performance: AcademicPerformance
    projects: list[str] = Field(default_factory=list, max_length=10)
    goals: CareerGoals


class CareerPrediction(BaseModel):
    label: str
    confidence: float = Field(..., ge=0, le=100)


class CareerPredictionResponse(BaseModel):
    top_prediction: str
    recommendations: list[CareerPrediction]
