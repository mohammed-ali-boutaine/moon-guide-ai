# tests/test_auth_refresh.py
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone


def test_refresh_token_success(client: TestClient, auth_headers):
    """Test successful token refresh"""
    response = client.post(
        "/auth/refresh",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # Refresh token should not change
    assert "refresh_token" not in data


def test_refresh_with_invalid_token(client: TestClient, setup_roles):
    """Test refresh with invalid refresh token"""
    response = client.post(
        "/auth/refresh",
        json={
            "refresh_token": "invalid-token-string"
        }
    )
    
    assert response.status_code == 401
    assert "Invalid or expired" in response.json()["detail"]


def test_refresh_with_revoked_token(client: TestClient, auth_headers, db_session):
    """Test refresh with revoked token"""
    from app.models.session import Session
    
    # Revoke the session
    session = db_session.query(Session).filter(
        Session.refresh_token == auth_headers["refresh_token"]
    ).first()
    session.revoked_at = datetime.now(timezone.utc)
    db_session.commit()
    
    response = client.post(
        "/auth/refresh",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    assert response.status_code == 401


def test_refresh_updates_access_token(client: TestClient, auth_headers, db_session):
    """Test that refresh updates the access token in database"""
    from app.models.session import Session
    
    old_session = db_session.query(Session).filter(
        Session.refresh_token == auth_headers["refresh_token"]
    ).first()
    old_access_token = old_session.access_token
    
    response = client.post(
        "/auth/refresh",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    assert response.status_code == 200
    new_access_token = response.json()["access_token"]
    
    # Verify token was updated in database
    db_session.refresh(old_session)
    assert old_session.access_token == new_access_token
    assert old_session.access_token != old_access_token