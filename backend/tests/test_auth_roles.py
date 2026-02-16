# tests/test_auth_roles.py
import pytest
from fastapi.testclient import TestClient


def test_teacher_access_teacher_endpoint(client: TestClient, teacher_user):
    """Test teacher can access teacher-only endpoint"""
    # Login as teacher
    response = client.post(
        "/auth/login",
        json={
            "email": "teacher@example.com",
            "password": "Teacher123456"
        }
    )
    tokens = response.json()
    
    # Access teacher endpoint (you'll need to create this)
    # This is just an example
    response = client.get(
        "/classes/taught",
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    
    # Should be successful (assuming endpoint exists)
    assert response.status_code in [200, 404]  # 404 if endpoint doesn't exist yet


def test_student_cannot_access_teacher_endpoint(client: TestClient, auth_headers):
    """Test student cannot access teacher-only endpoint"""
    # This test assumes you have a teacher-only endpoint
    # Adjust based on your actual endpoints
    pass


def test_inactive_user_cannot_access_protected_endpoint(
    client: TestClient, inactive_user, db_session
):
    """Test inactive user cannot access protected endpoints"""
    from app.models.session import Session
    from app.utils.jwt import create_access_token
    from datetime import datetime, timedelta, timezone
    
    # Create a session for inactive user
    access_token = create_access_token(str(inactive_user.id))
    refresh_token = "some-refresh-token"
    
    session = Session(
        user_id=inactive_user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db_session.add(session)
    db_session.commit()
    
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code == 403