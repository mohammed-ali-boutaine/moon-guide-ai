# tests/test_auth_login.py
import pytest
from fastapi.testclient import TestClient


def test_login_success(client: TestClient, test_user):
    """Test successful login"""
    response = client.post(
        "/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "Test123456"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, test_user):
    """Test login with incorrect password"""
    response = client.post(
        "/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "WrongPassword123"
        }
    )
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient, setup_roles):
    """Test login with non-existent email"""
    response = client.post(
        "/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "SomePassword123"
        }
    )
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_inactive_user(client: TestClient, inactive_user):
    """Test login with inactive account"""
    response = client.post(
        "/auth/login",
        json={
            "email": "inactive@example.com",
            "password": "Test123456"
        }
    )
    
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


def test_login_missing_credentials(client: TestClient):
    """Test login with missing credentials"""
    response = client.post(
        "/auth/login",
        json={}
    )
    
    assert response.status_code == 422


def test_login_creates_session(client: TestClient, test_user, db_session):
    """Test that login creates a session record"""
    from app.models.session import Session
    
    # Check no sessions exist initially
    initial_sessions = db_session.query(Session).filter(
        Session.user_id == test_user.id
    ).count()
    
    response = client.post(
        "/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "Test123456"
        }
    )
    
    assert response.status_code == 200
    
    # Check session was created
    sessions = db_session.query(Session).filter(
        Session.user_id == test_user.id
    ).count()
    
    assert sessions == initial_sessions + 1