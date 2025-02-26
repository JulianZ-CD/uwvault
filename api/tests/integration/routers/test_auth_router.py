import pytest
import time
from fastapi import status
from api.tests.factories import (
    UserCreateFactory,
    NonExistentUserLoginFactory,
    AdminUserCreateFactory
)
from api.services.auth_service import AuthService


@pytest.mark.integration
class TestAuthRouter:
    BASE_URL = "/api/py/auth"  # auth router base url

    @pytest.fixture(autouse=True)
    def setup_method(self):
        time.sleep(1)
        yield

    def test_register_user(self, test_client):
        # Arrange
        user_data = UserCreateFactory().model_dump(mode='json')

        # Act
        response = test_client.post(
            f"{self.BASE_URL}/register", json=user_data)

        if response.status_code == 400 and "rate limit" in response.json().get("detail", ""):
            pytest.skip("Rate limit exceeded")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["user"]["email"] == user_data["email"]
        assert response_data["user"]["user_metadata"]["username"] == user_data["username"]
        assert "id" in response_data["user"]
        assert "session" in response_data

    def test_login_user(self, test_client):
        # Arrange
        # First register a user
        user_data = UserCreateFactory().model_dump(mode='json')
        test_client.post(f"{self.BASE_URL}/register", json=user_data)

        # Act
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        response = test_client.post(f"{self.BASE_URL}/login", json=login_data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert "session" in response.json()
        assert "access_token" in response.json()["session"]

    def test_get_user_profile(self, test_client):
        # Arrange
        # First create and login a user
        user_data = UserCreateFactory().model_dump(mode='json')
        register_response = test_client.post(
            f"{self.BASE_URL}/register", json=user_data)
        access_token = register_response.json()["session"]["access_token"]

        # Act
        response = test_client.get(
            f"{self.BASE_URL}/user",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        user_profile = response.json()
        assert user_profile["email"] == user_data["email"]
        assert user_profile["username"] == user_data["username"]

    def test_update_username(self, test_client):
        # Arrange
        user_data = UserCreateFactory().model_dump(mode='json')
        register_response = test_client.post(
            f"{self.BASE_URL}/register", json=user_data)
        access_token = register_response.json()["session"]["access_token"]
        new_username = "updated_username"

        # Act
        response = test_client.put(
            f"{self.BASE_URL}/users/username",
            json={"new_username": new_username},
            headers={"Authorization": f"Bearer {access_token}"}
        )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["username"] == new_username

    @pytest.fixture
    async def admin_token(self, test_client):
        """Create an admin user and return its token"""
        # 1. register admin user
        admin_data = AdminUserCreateFactory().model_dump(mode='json')
        register_response = test_client.post(
            f"{self.BASE_URL}/register", json=admin_data)

        assert register_response.status_code == status.HTTP_200_OK
        user_id = register_response.json()["user"]["id"]

        # 2. set user role to admin
        auth_service = AuthService()
        await auth_service.set_user_role(user_id, "admin")

        # 3. login and get token
        login_response = test_client.post(
            f"{self.BASE_URL}/login",
            json={
                "email": admin_data["email"],
                "password": admin_data["password"]
            }
        )
        assert login_response.status_code == status.HTTP_200_OK

        return login_response.json()["session"]["access_token"]

    async def test_admin_operations(self, test_client, admin_token):
        """Test admin operations"""
        # use admin_token to perform admin operations
        headers = {"Authorization": f"Bearer {admin_token}"}

        # get user list
        users_response = test_client.get(
            f"{self.BASE_URL}/admin/users",
            headers=headers
        )

        assert users_response.status_code == status.HTTP_200_OK

        # Test set user role
        user_data = UserCreateFactory().model_dump(mode='json')
        user_response = test_client.post(
            f"{self.BASE_URL}/register", json=user_data)
        user_id = user_response.json()["user"]["id"]

        role_response = test_client.put(
            f"{self.BASE_URL}/admin/users/{user_id}/role",
            json={"role": "admin"},
            headers=headers
        )
        assert role_response.status_code == status.HTTP_200_OK

        # Test delete user
        delete_response = test_client.delete(
            f"{self.BASE_URL}/admin/users/{user_id}",
            headers=headers
        )
        assert delete_response.status_code == status.HTTP_200_OK

    def test_error_cases(self, test_client):
        """Test various error cases"""
        try:
            # Test invalid registration with custom invalid data
            invalid_data = {
                "email": "test@example.com",
                "password": "short",
                "username": "a",
                "is_active": True,
                "is_superuser": False,
                "is_verified": False,
                "redirect_url": "https://example.com/verify"
            }
            invalid_register = test_client.post(
                f"{self.BASE_URL}/register", json=invalid_data)
            assert invalid_register.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

            # Test invalid login
            invalid_login = NonExistentUserLoginFactory().model_dump(mode='json')
            invalid_login_response = test_client.post(
                f"{self.BASE_URL}/login", json=invalid_login)
            assert invalid_login_response.status_code == status.HTTP_401_UNAUTHORIZED

            # Test unauthorized access
            unauth_response = test_client.get(f"{self.BASE_URL}/user")
            assert unauth_response.status_code == status.HTTP_403_FORBIDDEN

            # Test password update
            user_data = UserCreateFactory().model_dump(mode='json')
            register_response = test_client.post(
                f"{self.BASE_URL}/register", json=user_data)
            session = register_response.json()["session"]

            # Update password
            update_data = {
                "access_token": session["access_token"],
                "refresh_token": session["refresh_token"],
                "new_password": "NewSecurePass123!"
            }

            response = test_client.post(
                f"{self.BASE_URL}/update-password",
                json=update_data
            )
            assert response.status_code == status.HTTP_200_OK

            # Try login with new password
            login_response = test_client.post(
                f"{self.BASE_URL}/login",
                json={
                    "email": user_data["email"],
                    "password": "NewSecurePass123!"
                }
            )
            assert login_response.status_code == status.HTTP_200_OK

        except Exception as e:
            pytest.fail(f"Unexpected error occurred: {e}")
