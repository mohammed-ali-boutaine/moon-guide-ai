# tests/test_auth_register.py
import pytest
from fastapi.testclient import TestClient


def test_register_success(client: TestClient, setup_roles):
    """Test successful user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "SecurePass123",
            "first_name": "New",
            "last_name": "User",
            "role": "STUDENT"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client: TestClient, test_user):
    """Test registration with existing email fails"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "testuser@example.com",  # Already exists
            "password": "SecurePass123",
            "first_name": "New",
            "last_name": "User",
            "role": "STUDENT"
        }
    )
    
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]


def test_register_invalid_email(client: TestClient, setup_roles):
    """Test registration with invalid email format"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "notanemail",
            "password": "SecurePass123",
            "first_name": "New",
            "last_name": "User",
            "role": "STUDENT"
        }
    )
    
    assert response.status_code == 422  # Validation error


def test_register_short_password(client: TestClient, setup_roles):
    """Test registration with password too short"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "short",  # Less than 8 characters
            "first_name": "New",
            "last_name": "User",
            "role": "STUDENT"
        }
    )
    
    assert response.status_code == 422


def test_register_missing_fields(client: TestClient, setup_roles):
    """Test registration with missing required fields"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "SecurePass123",
            # Missing first_name and last_name
        }
    )
    
    assert response.status_code == 422


def test_register_teacher_role(client: TestClient, setup_roles):
    """Test registration with teacher role"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newteacher@example.com",
            "password": "SecurePass123",
            "first_name": "New",
            "last_name": "Teacher",
            "role": "TEACHER"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data


def test_register_invalid_role(client: TestClient, setup_roles):
    """Test registration with invalid role"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "SecurePass123",
            "first_name": "New",
            "last_name": "User",
            "role": "INVALID_ROLE"
        }
    )
    
    assert response.status_code == 422