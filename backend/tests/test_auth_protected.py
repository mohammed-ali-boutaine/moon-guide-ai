# tests/test_auth_protected.py
import pytest
from fastapi.testclient import TestClient


def test_access_protected_endpoint_with_valid_token(client: TestClient, auth_headers):
    """Test accessing protected endpoint with valid token"""
    response = client.get(
        "/users/me",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"


def test_access_protected_endpoint_without_token(client: TestClient):
    """Test accessing protected endpoint without token"""
    response = client.get("/users/me")
    
    assert response.status_code == 403  # HTTPBearer returns 403


def test_access_protected_endpoint_with_invalid_token(client: TestClient):
    """Test accessing protected endpoint with invalid token"""
    response = client.get(
        "/users/me",
        headers={"Authorization": "Bearer invalid-token-here"}
    )
    
    assert response.status_code == 401


def test_access_protected_endpoint_with_expired_token(client: TestClient, db_session):
    """Test accessing protected endpoint with expired token"""
    from datetime import datetime, timedelta, timezone
    from app.utils.jwt import create_access_token
    from app.models.user import User
    
    # Create an expired token
    user = db_session.query(User).first()
    expired_token = create_access_token(
        str(user.id),
        expires_delta=timedelta(minutes=-30)  # Already expired
    )
    
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    
    assert response.status_code == 401


def test_access_with_revoked_session(client: TestClient, auth_headers, db_session):
    """Test accessing protected endpoint with revoked session"""
    from app.models.session import Session
    from datetime import datetime, timezone
    
    # Revoke the session
    session = db_session.query(Session).filter(
        Session.access_token == auth_headers["Authorization"].split(" ")[1]
    ).first()
    session.revoked_at = datetime.now(timezone.utc)
    db_session.commit()
    
    response = client.get(
        "/users/me",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    
    assert response.status_code == 401