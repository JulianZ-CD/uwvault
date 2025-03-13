import pytest
from fastapi import status
from api.services.auth_service import AuthService
from api.core.config import get_settings
from api.tests.factories import (
    UserCreateFactory,
    AdminUserCreateFactory
)


@pytest.mark.e2e
def test_auth_flow(test_client, cleanup_users):
    """Test complete authentication flow"""
    try:
        # 1. Register new user
        user_data = UserCreateFactory().model_dump(mode='json')
        cleanup_users.append(user_data["email"])
        register_response = test_client.post(
            "/api/py/auth/register", json=user_data)

        if register_response.status_code == 400 and "rate limit" in register_response.json().get("detail", ""):
            pytest.skip("Rate limit exceeded")

        assert register_response.status_code == status.HTTP_200_OK
        response_data = register_response.json()
        access_token = response_data["session"]["access_token"]

        # 2. Login with created user
        login_response = test_client.post("/api/py/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert login_response.status_code == status.HTTP_200_OK
        assert "session" in login_response.json()

        # 3. Get user profile
        profile_response = test_client.get(
            "/api/py/auth/user",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert profile_response.status_code == status.HTTP_200_OK
        profile = profile_response.json()
        assert profile["email"] == user_data["email"]
        assert profile["username"] == user_data["username"]

        # 4. Update username
        new_username = "updated_test_user"
        update_response = test_client.put(
            "/api/py/auth/users/username",
            json={"new_username": new_username},
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert update_response.status_code == status.HTTP_200_OK
        assert update_response.json()["username"] == new_username

        # 5. Verify username update in profile
        updated_profile_response = test_client.get(
            "/api/py/auth/user",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert updated_profile_response.status_code == status.HTTP_200_OK
        updated_profile = updated_profile_response.json()
        assert updated_profile["username"] == new_username
        # make sure other fields are not changed
        assert updated_profile["email"] == user_data["email"]

        # 6. Logout
        logout_response = test_client.post(
            "/api/py/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert logout_response.status_code == status.HTTP_200_OK

    except Exception as e:
        pytest.fail(f"Unexpected error occurred: {e}")


@pytest.mark.e2e
def test_auth_error_cases(test_client):
    """Test error cases for auth operations"""
    try:
        # 1. Register with invalid data
        invalid_data = {
            "email": "invalid-email",
            "password": "short",
            "username": "a",
            "is_active": True,
            "is_superuser": False,
            "is_verified": False,
            "redirect_url": "https://example.com/verify"
        }
        register_response = test_client.post(
            "/api/py/auth/register", json=invalid_data)
        assert register_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # 2. Login with non-existent user
        invalid_login = {
            "email": "nonexistent@example.com",
            "password": "WrongPass123!"
        }
        login_response = test_client.post(
            "/api/py/auth/login", json=invalid_login)
        assert login_response.status_code == status.HTTP_401_UNAUTHORIZED

        # 3. Access protected route without token
        profile_response = test_client.get("/api/py/auth/user")
        assert profile_response.status_code == status.HTTP_403_FORBIDDEN

        # 4. Access with invalid token
        invalid_token_response = test_client.get(
            "/api/py/auth/user",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert invalid_token_response.status_code == status.HTTP_401_UNAUTHORIZED

    except Exception as e:
        pytest.fail(f"Unexpected error occurred: {e}")


@pytest.mark.e2e
def test_admin_operations(test_client, admin_token, cleanup_users):
    """Test admin operations flow"""
    try:
        cleanup_users.append(admin_token["email"])  # 添加admin邮箱到清理列表

        # 1. Create normal user
        user_data = UserCreateFactory().model_dump(mode='json')
        cleanup_users.append(user_data["email"])
        register_response = test_client.post(
            "/api/py/auth/register", json=user_data)

        if register_response.status_code == 400 and "rate limit" in register_response.json().get("detail", ""):
            pytest.skip("Rate limit exceeded")

        assert register_response.status_code == status.HTTP_200_OK
        user_id = register_response.json()["user"]["id"]

        # 2. List all users as admin
        users_response = test_client.get(
            "/api/py/auth/admin/users",
            # 使用token字段
            headers={"Authorization": f"Bearer {admin_token['token']}"}
        )
        assert users_response.status_code == status.HTTP_200_OK
        users = users_response.json()
        assert len(users) > 0

        # 3. Change user role
        role_response = test_client.put(
            f"/api/py/auth/admin/users/{user_id}/role",
            json={"role": "admin"},
            # 使用token字段
            headers={"Authorization": f"Bearer {admin_token['token']}"}
        )
        assert role_response.status_code == status.HTTP_200_OK

        # Verify the role change
        users_response = test_client.get(
            "/api/py/auth/admin/users",
            # 使用token字段
            headers={"Authorization": f"Bearer {admin_token['token']}"}
        )
        assert users_response.status_code == status.HTTP_200_OK
        users = users_response.json()
        target_user = next(
            (user for user in users if user["id"] == user_id), None)
        assert target_user is not None
        assert target_user["role"] == "admin"

        # 4. Delete user
        delete_response = test_client.delete(
            f"/api/py/auth/admin/users/{user_id}",
            # 使用token字段
            headers={"Authorization": f"Bearer {admin_token['token']}"}
        )
        assert delete_response.status_code == status.HTTP_200_OK

    except Exception as e:
        pytest.fail(f"Unexpected error occurred: {e}")


@pytest.fixture
async def admin_token(test_client):
    """Create an admin user and return its token"""
    try:
        # Get settings
        settings = get_settings()

        # Create AuthService instance
        auth_service = AuthService()

        # Register admin user using factory
        admin_data = AdminUserCreateFactory().model_dump(mode='json')
        register_response = test_client.post(
            "/api/py/auth/register", json=admin_data)

        if register_response.status_code == 400 and "rate limit" in register_response.json().get("detail", ""):
            pytest.skip("Rate limit exceeded")

        assert register_response.status_code == status.HTTP_200_OK
        user_id = register_response.json()["user"]["id"]

        # Set user role to admin
        await auth_service.set_user_role(user_id, "admin")

        # Login and get token
        login_response = test_client.post("/api/py/auth/login", json={
            "email": admin_data["email"],
            "password": admin_data["password"]
        })
        assert login_response.status_code == status.HTTP_200_OK

        return {
            "token": login_response.json()["session"]["access_token"],
            "email": admin_data["email"]
        }

    except Exception as e:
        pytest.fail(f"Unexpected error occurred in admin_token fixture: {e}")
