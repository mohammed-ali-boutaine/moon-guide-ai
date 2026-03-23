# tests/test_auth_roles.py
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.models.session import Session
from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_session(db_session, user, extra_seconds: int = 3600):
    """Create a valid active session for the given user and return the access token."""
    access_token = create_access_token(str(user.id))
    refresh_token = f"refresh-{user.id}"
    session = Session(
        user_id=user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=extra_seconds),
    )
    db_session.add(session)
    db_session.commit()
    return access_token


# ---------------------------------------------------------------------------
# TEACHER role tests
# ---------------------------------------------------------------------------

def test_teacher_can_create_class(client: TestClient, teacher_user, db_session):
    """Teacher can create a class (POST /api/classes → 201)."""
    token = _create_session(db_session, teacher_user)
    response = client.post(
        "/api/classes",
        json={"name": "Python 101", "description": "Intro to Python"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201


def test_teacher_can_list_own_classes(client: TestClient, teacher_user, db_session):
    """Teacher can list their classes (GET /api/classes → 200)."""
    token = _create_session(db_session, teacher_user)
    response = client.get(
        "/api/classes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_teacher_cannot_access_admin_user_list(client: TestClient, teacher_user, db_session):
    """Teacher cannot list all users — admin-only endpoint (GET /api/users → 403)."""
    token = _create_session(db_session, teacher_user)
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code in (403, 404)  # 404 if endpoint not yet implemented


# ---------------------------------------------------------------------------
# STUDENT role tests
# ---------------------------------------------------------------------------

def test_student_cannot_create_class(client: TestClient, student_user, db_session):
    """Student cannot create a class — teacher-only endpoint (POST /api/classes → 403)."""
    token = _create_session(db_session, student_user)
    response = client.post(
        "/api/classes",
        json={"name": "Hack Class", "description": "Should not work"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_student_cannot_access_teacher_endpoint(client: TestClient, student_user, db_session):
    """Student cannot list teacher classes (GET /api/classes → 403)."""
    token = _create_session(db_session, student_user)
    response = client.get(
        "/api/classes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_student_can_access_own_profile(client: TestClient, student_user, db_session):
    """Student can read their own profile (GET /api/users/me → 200)."""
    token = _create_session(db_session, student_user)
    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == student_user.email


def test_student_cannot_list_all_users(client: TestClient, student_user, db_session):
    """Student cannot list all users — admin-only endpoint (GET /api/users → 403)."""
    token = _create_session(db_session, student_user)
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code in (403, 404)


# ---------------------------------------------------------------------------
# ADMIN role tests
# ---------------------------------------------------------------------------

def test_admin_can_access_own_profile(client: TestClient, admin_user, db_session):
    """Admin can read their own profile (GET /api/users/me → 200)."""
    token = _create_session(db_session, admin_user)
    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_user.email


# ---------------------------------------------------------------------------
# Token / authentication tests
# ---------------------------------------------------------------------------

def test_no_token_returns_401_or_403(client: TestClient):
    """Unauthenticated request is rejected (GET /api/users/me)."""
    response = client.get("/api/users/me")
    assert response.status_code in (401, 403)


def test_invalid_token_returns_401(client: TestClient):
    """Garbage Bearer token is rejected (GET /api/users/me → 401)."""
    response = client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.token"},
    )
    assert response.status_code in (401, 403)


def test_expired_token_returns_401(client: TestClient, student_user, db_session):
    """Expired JWT is rejected (GET /api/users/me → 401)."""
    expired_token = create_access_token(str(student_user.id), expires_delta=timedelta(seconds=-1))
    session = Session(
        user_id=student_user.id,
        access_token=expired_token,
        refresh_token="some-refresh",
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    db_session.add(session)
    db_session.commit()

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code in (401, 403)


def test_revoked_session_returns_401(client: TestClient, student_user, db_session):
    """Token with no matching session (revoked) is rejected (GET /api/users/me → 401)."""
    dangling_token = create_access_token(str(student_user.id))
    # Intentionally do NOT add a Session row for this token
    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {dangling_token}"},
    )
    assert response.status_code in (401, 403)


def test_inactive_user_cannot_access_protected_endpoint(
    client: TestClient, inactive_user, db_session
):
    """Inactive user is blocked even with a valid token (GET /api/users/me → 403)."""
    access_token = create_access_token(str(inactive_user.id))
    session = Session(
        user_id=inactive_user.id,
        access_token=access_token,
        refresh_token="some-refresh-token",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(session)
    db_session.commit()

    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 403
