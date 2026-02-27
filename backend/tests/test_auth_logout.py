# tests/test_auth_logout.py
import pytest
from fastapi.testclient import TestClient


def test_logout_success(client: TestClient, auth_headers):
    """Test successful logout"""
    response = client.post(
        "/api/auth/logout",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    assert response.status_code == 200
    assert "Successfully logged out" in response.json()["message"]


def test_logout_revokes_session(client: TestClient, auth_headers, db_session):
    """Test that logout revokes the session"""
    from app.models.session import Session
    
    response = client.post(
        "/api/auth/logout",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    assert response.status_code == 200
    
    # Check session is revoked
    session = db_session.query(Session).filter(
        Session.refresh_token == auth_headers["refresh_token"]
    ).first()
    
    assert session.revoked_at is not None


def test_logout_with_invalid_token(client: TestClient):
    """Test logout with invalid refresh token"""
    response = client.post(
        "/api/auth/logout",
        json={
            "refresh_token": "invalid-token"
        }
    )
    
    # Should still return 200 (idempotent)
    assert response.status_code == 200


def test_cannot_refresh_after_logout(client: TestClient, auth_headers):
    """Test that refresh token cannot be used after logout"""
    # Logout
    client.post(
        "/api/auth/logout",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    # Try to refresh
    response = client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": auth_headers["refresh_token"]
        }
    )
    
    assert response.status_code == 401


def test_logout_all_sessions(client: TestClient, test_user, db_session):
    """Test logout from all devices"""
    from app.models.session import Session
    
    # Create multiple sessions for the user
    login_response1 = client.post(
        "/api/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "Test123456"
        }
    )
    tokens1 = login_response1.json()
    
    login_response2 = client.post(
        "/api/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "Test123456"
        }
    )
    
    # Verify multiple sessions exist
    sessions_before = db_session.query(Session).filter(
        Session.user_id == test_user.id,
        Session.revoked_at.is_(None)
    ).count()
    assert sessions_before >= 2
    
    # Logout from all devices
    response = client.post(
        "/api/auth/logout-all",
        headers={"Authorization": f"Bearer {tokens1['access_token']}"}
    )
    
    assert response.status_code == 200
    
    # Verify all sessions are revoked
    active_sessions = db_session.query(Session).filter(
        Session.user_id == test_user.id,
        Session.revoked_at.is_(None)
    ).count()
    
    assert active_sessions == 0