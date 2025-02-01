import pytest
from fastapi import status


@pytest.mark.e2e
def test_auth_flow(test_client):
    """Test complete authentication flow"""
    # 1. Register new user
    register_data = {
        "email": "e2e_test@example.com",
        "password": "testpassword123",
        "username": "e2e_test_user"
    }
    register_response = test_client.post(
        "/api/py/auth/register", json=register_data)
    assert register_response.status_code == status.HTTP_200_OK
    user_data = register_response.json()
    access_token = user_data["session"]["access_token"]

    # 2. Login with created user
    login_data = {
        "email": register_data["email"],
        "password": register_data["password"]
    }
    login_response = test_client.post("/api/py/auth/login", json=login_data)
    assert login_response.status_code == status.HTTP_200_OK
    assert "session" in login_response.json()

    # 3. Get user profile
    profile_response = test_client.get(
        "/api/py/auth/user",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert profile_response.status_code == status.HTTP_200_OK
    profile = profile_response.json()
    assert profile["email"] == register_data["email"]
    assert profile["username"] == register_data["username"]

    # 4. Update username
    new_username = "updated_e2e_user"
    update_response = test_client.put(
        "/api/py/auth/users/username",
        json={"new_username": new_username},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["username"] == new_username

    # 5. Logout
    logout_response = test_client.post(
        "/api/py/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert logout_response.status_code == status.HTTP_200_OK


@pytest.mark.e2e
def test_auth_error_cases(test_client):
    """Test error cases for auth operations"""
    # 1. Register with invalid data
    invalid_register = {
        "email": "invalid_email",
        "password": "short"
    }
    register_response = test_client.post(
        "/api/py/auth/register", json=invalid_register)
    assert register_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 2. Login with non-existent user
    invalid_login = {
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    login_response = test_client.post("/api/py/auth/login", json=invalid_login)
    assert login_response.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Access protected route without token
    profile_response = test_client.get("/api/py/auth/user")
    assert profile_response.status_code == status.HTTP_401_UNAUTHORIZED

    # 4. Access with invalid token
    invalid_token_response = test_client.get(
        "/api/py/auth/user",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert invalid_token_response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.e2e
def test_admin_operations(test_client, admin_token):
    """Test admin operations flow"""
    # 1. Create normal user
    user_data = {
        "email": "normal_user@example.com",
        "password": "normalpass123",
        "username": "normal_user"
    }
    register_response = test_client.post(
        "/api/py/auth/register", json=user_data)
    assert register_response.status_code == status.HTTP_200_OK
    user_id = register_response.json()["user"]["id"]

    # 2. List all users as admin
    users_response = test_client.get(
        "/api/py/auth/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert users_response.status_code == status.HTTP_200_OK
    users = users_response.json()
    assert len(users) > 0

    # 3. Change user role
    role_response = test_client.put(
        f"/api/py/auth/admin/users/{user_id}/role",
        json={"role": "admin"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert role_response.status_code == status.HTTP_200_OK

    # 4. Delete user
    delete_response = test_client.delete(
        f"/api/py/auth/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert delete_response.status_code == status.HTTP_200_OK
