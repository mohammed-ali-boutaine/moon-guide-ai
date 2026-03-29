"""
services/career_service.py

Load the trained career orientation model and provide predictions.
The model is loaded lazily on first prediction call. torch/sentence_transformers
are imported only when needed so the app starts fine even without ML deps.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.core.logging import logger

# ── Paths ────────────────────────────────────────────────────────────────────
# In Docker: career_orientation is mounted at /career_orientation
# Locally: it's at the project root (4 levels up from this file)
_DOCKER_CAREER_DIR = Path("/career_orientation")
_LOCAL_CAREER_DIR = Path(__file__).resolve().parent.parent.parent.parent / "career_orientation"
_CAREER_DIR = _DOCKER_CAREER_DIR if _DOCKER_CAREER_DIR.exists() else _LOCAL_CAREER_DIR
_MODEL_PATH = _CAREER_DIR / "models" / "career_model.pt"
_LABEL_MAP_PATH = _CAREER_DIR / "data" / "label_map.json"

# ── Lazy-loaded singleton ────────────────────────────────────────────────────
_model = None
_label_to_id: dict[str, int] = {}
_id_to_label: dict[int, str] = {}


def _load_model() -> None:
    global _model, _label_to_id, _id_to_label

    # Lazy imports — keeps app startup fast and avoids hard crash if
    # torch / sentence-transformers are not installed.
    import torch
    import torch.nn as nn
    from sentence_transformers import SentenceTransformer

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if not _MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Career model not found at {_MODEL_PATH}. "
            "Run the training notebook first."
        )
    if not _LABEL_MAP_PATH.exists():
        raise FileNotFoundError(
            f"Label map not found at {_LABEL_MAP_PATH}. "
            "Run the training notebook first."
        )

    with open(_LABEL_MAP_PATH, "r") as f:
        _label_to_id = json.load(f)
    _id_to_label = {v: k for k, v in _label_to_id.items()}

    # ── Model definition (must match train.py architecture) ──────────────
    class CareerClassifier(nn.Module):
        def __init__(self, num_classes: int = 6):
            super().__init__()
            self.encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            for param in self.encoder.parameters():
                param.requires_grad = False
            self.classifier = nn.Sequential(
                nn.Linear(384, 256),
                nn.BatchNorm1d(256),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(256, 128),
                nn.BatchNorm1d(128),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(128, num_classes),
            )

        def forward(self, texts: list[str]) -> torch.Tensor:
            embeddings = self.encoder.encode(
                texts, convert_to_tensor=True, device=device, show_progress_bar=False
            )
            return self.classifier(embeddings)

    _model = CareerClassifier(num_classes=len(_label_to_id)).to(device)
    _model.load_state_dict(
        torch.load(_MODEL_PATH, map_location=device, weights_only=True)
    )
    _model.eval()
    logger.info("Career model loaded (%d classes) on %s", len(_label_to_id), device)


def _get_model():
    if _model is None:
        _load_model()
    return _model


# ── Public helpers ───────────────────────────────────────────────────────────

def profile_to_text(profile: dict) -> str:
    """Convert a structured profile dict to the text format the model expects."""
    skills = ", ".join(profile.get("skills", []))
    interests = ", ".join(profile.get("interests", []))
    projects = ". ".join(profile.get("projects", []))
    goals = profile.get("goals", {})
    acad = profile.get("academic_performance", {})

    return (
        f"Skills: {skills}. "
        f"Interests: {interests}. "
        f"Projects: {projects}. "
        f"Goals: target {goals.get('target_field', 'N/A')}, "
        f"salary {goals.get('salary_expectation', 'N/A')}, "
        f"remote {goals.get('remote_preference', 'N/A')}. "
        f"Academic: Math {acad.get('math', 0)}/20, "
        f"Sciences {acad.get('sciences', 0)}/20, "
        f"Languages {acad.get('languages', 0)}/20, "
        f"Arts {acad.get('arts', 0)}/20."
    )


def predict_career(profile: dict) -> dict:
    """
    Return career predictions for a student profile.

    Returns:
        {
            "top_prediction": "AI/ML",
            "recommendations": [
                {"label": "AI/ML", "confidence": 82.3},
                {"label": "Data Science", "confidence": 11.5},
                {"label": "Software Engineering", "confidence": 4.1},
            ]
        }
    """
    import torch

    model = _get_model()
    text = profile_to_text(profile)

    with torch.no_grad():
        logits = model([text])
        probs = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

    top_indices = probs.argsort()[::-1][:3]
    recommendations = [
        {"label": _id_to_label[int(idx)], "confidence": round(float(probs[idx]) * 100, 2)}
        for idx in top_indices
    ]

    return {
        "top_prediction": recommendations[0]["label"],
        "recommendations": recommendations,
    }


def is_model_available() -> bool:
    """Check whether the trained model files exist on disk."""
    return _MODEL_PATH.exists() and _LABEL_MAP_PATH.exists()


def get_available_careers() -> list[str]:
    """Return the list of career labels the model can predict."""
    if not _id_to_label:
        if _LABEL_MAP_PATH.exists():
            with open(_LABEL_MAP_PATH, "r") as f:
                lmap = json.load(f)
            return sorted(lmap.keys())
        return []
    return sorted(_label_to_id.keys())
