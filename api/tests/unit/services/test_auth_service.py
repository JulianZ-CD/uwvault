import pytest
from fastapi import HTTPException, status
from api.services.auth_service import AuthService
from api.models.user import UserCreate, UserLogin, PasswordUpdateRequest
from api.tests.factories import UserCreateFactory, UserLoginFactory
from datetime import datetime


@pytest.mark.unit
class TestAuthService:
    @pytest.fixture
    def auth_service(self, mocker):
        """Create AuthService instance with mocked dependencies"""
        # Mock the create_client function
        mocker.patch('api.services.auth_service.create_client')
        service = AuthService()
        # Mock logger
        service.logger = mocker.Mock()
        return service

    @pytest.mark.asyncio
    async def test_sign_up_success(self, auth_service, mocker):
        """Test successful user registration"""
        # Arrange
        user_data = UserCreate(
            email="test@example.com",
            password="Password123!",
            username="testuser",
            redirect_url="http://example.com/verify"
        )

        # Mock admin client list_users response
        auth_service.admin_client.auth.admin.list_users.return_value = []

        # Mock client sign_up response
        mock_user = mocker.Mock(
            id="test-id",
            email=user_data.email,
            user_metadata={"username": user_data.username, "role": "user"}
        )
        mock_session = mocker.Mock(access_token="test-token")
        auth_service.client.auth.sign_up.return_value = mocker.Mock(
            user=mock_user,
            session=mock_session
        )

        # Act
        result = await auth_service.sign_up(user_data)

        # Assert
        assert result["user"] == mock_user
        assert result["session"] == mock_session
        auth_service.logger.info.assert_called()
        auth_service.admin_client.auth.admin.list_users.assert_called_once()
        auth_service.client.auth.sign_up.assert_called_once()

    @pytest.mark.asyncio
    async def test_sign_up_existing_email(self, auth_service):
        """Test registration with existing email"""
        # Arrange
        user_data = UserCreate(
            email="existing@example.com",
            password="Password123!",
            username="testuser"
        )

        # Mock existing user
        mock_existing_user = type('User', (), {'email': user_data.email})()
        auth_service.admin_client.auth.admin.list_users.return_value = [
            mock_existing_user]

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.sign_up(user_data)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in str(exc_info.value.detail)
        auth_service.logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_sign_in_success(self, auth_service, mocker):
        """Test successful login"""
        # Arrange
        credentials = UserLogin(
            email="test@example.com",
            password="Password123!"
        )

        mock_user = mocker.Mock(id="test-id")
        mock_session = mocker.Mock(access_token="test-token")
        auth_service.client.auth.sign_in_with_password.return_value = mocker.Mock(
            user=mock_user,
            session=mock_session
        )

        # Act
        result = await auth_service.sign_in(credentials)

        # Assert
        assert result["user"] == mock_user
        assert result["session"] == mock_session
        auth_service.logger.info.assert_called()

    @pytest.mark.asyncio
    async def test_sign_in_invalid_credentials(self, auth_service, mocker):
        """Test login with invalid credentials"""
        # Arrange
        credentials = UserLoginFactory()
        auth_service.client.auth.sign_in_with_password.side_effect = Exception(
            "Invalid credentials")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.sign_in(credentials)
        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_sign_out_success(self, auth_service):
        """Test successful logout"""
        # Arrange
        access_token = "test-token"
        auth_service.client.auth.sign_out.return_value = None

        # Act
        result = await auth_service.sign_out(access_token)

        # Assert
        assert result is True
        auth_service.logger.info.assert_called()
        auth_service.client.auth.sign_out.assert_called_once()

    @pytest.mark.asyncio
    async def test_reset_password_success(self, auth_service, mocker):
        """Test successful password reset request"""
        # Arrange
        email = "test@example.com"
        redirect_url = "http://example.com/reset"
        auth_service.client.auth.reset_password_for_email.return_value = {
            "success": True}

        # Act
        result = await auth_service.reset_password(email, redirect_url)

        # Assert
        assert result == {"success": True}
        auth_service.client.auth.reset_password_for_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_password_success(self, auth_service, mocker):
        """Test successful password update"""
        # Arrange
        request = PasswordUpdateRequest(
            access_token="fake_access_token",
            refresh_token="fake_refresh_token",
            new_password="NewPassword123!"
        )
        mock_response = mocker.Mock()
        mock_response.user = {"id": "123"}
        auth_service.client.auth.update_user.return_value = mock_response

        # Act
        result = await auth_service.update_user_password(
            request.access_token,
            request.refresh_token,
            request.new_password
        )

        # Assert
        assert result["status"] == "success"
        assert "user" in result
        auth_service.client.auth.set_session.assert_called_once()
        auth_service.client.auth.update_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_current_user_success(self, auth_service, mocker):
        """Test getting current user info"""
        # Arrange
        token = "test-token"
        mock_user = mocker.Mock(
            id="test-id",
            email="test@example.com",
            user_metadata={
                "username": "testuser",
                "role": "user"
            }
        )
        auth_service.client.auth.get_user.return_value = mocker.Mock(
            user=mock_user)

        # Act
        result = await auth_service.get_current_user(token)

        # Assert
        assert result["id"] == mock_user.id
        assert result["email"] == mock_user.email
        assert result["username"] == mock_user.user_metadata["username"]
        assert result["role"] == mock_user.user_metadata["role"]
        auth_service.logger.info.assert_called()

    @pytest.mark.asyncio
    async def test_require_admin_success(self, auth_service, mocker):
        """Test admin check with admin user"""
        # Arrange
        token = "test-token"
        mock_user = {
            "id": "test-id",
            "email": "admin@example.com",
            "role": "admin"
        }
        mocker.patch.object(
            auth_service,
            'get_current_user',
            return_value=mock_user
        )

        # Act
        result = await auth_service.require_admin(token)

        # Assert
        assert result == mock_user

    @pytest.mark.asyncio
    async def test_require_admin_unauthorized(self, auth_service, mocker):
        """Test admin check with non-admin user"""
        # Arrange
        token = "test-token"
        mock_user = {
            "id": "test-id",
            "email": "user@example.com",
            "role": "user"
        }
        mocker.patch.object(
            auth_service,
            'get_current_user',
            return_value=mock_user
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.require_admin(token)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Admin access required" in str(exc_info.value.detail)
        auth_service.logger.warning.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_users_success(self, auth_service, mocker):
        """Test listing all users"""
        # Arrange
        mock_users = [
            mocker.Mock(
                id="1",
                email="user1@example.com",
                user_metadata={"username": "user1", "role": "user"}
            ),
            mocker.Mock(
                id="2",
                email="user2@example.com",
                user_metadata={"username": "user2", "role": "admin"}
            )
        ]
        auth_service.admin_client.auth.admin.list_users.return_value = mock_users

        # Act
        result = await auth_service.list_users()

        # Assert
        assert len(result) == 2
        assert all(isinstance(user, dict) for user in result)
        assert all(
            set(user.keys()) == {"id", "email", "username", "role"}
            for user in result
        )

    @pytest.mark.asyncio
    async def test_set_user_role_success(self, auth_service, mocker):
        """Test setting user role"""
        # Arrange
        user_id = "123"
        new_role = "admin"
        mock_response = mocker.Mock(user={"id": user_id})
        auth_service.admin_client.auth.admin.update_user_by_id.return_value = mock_response

        # Act
        result = await auth_service.set_user_role(user_id, new_role)

        # Assert
        assert result.user["id"] == user_id
        auth_service.admin_client.auth.admin.update_user_by_id.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_username_success(self, auth_service, mocker):
        """Test updating username"""
        # Arrange
        token = "test-token"
        new_username = "newusername"
        current_user = {
            "id": "test-id",
            "email": "test@example.com",
            "role": "user"
        }

        # Mock get_current_user
        mocker.patch.object(
            auth_service,
            'get_current_user',
            return_value=current_user
        )

        # Mock update_user_by_id response
        mock_response = mocker.Mock()
        mock_response.user = mocker.Mock(
            id=current_user["id"],
            email=current_user["email"],
            user_metadata={
                "username": new_username,
                "role": current_user["role"]
            }
        )
        auth_service.admin_client.auth.admin.update_user_by_id.return_value = mock_response

        # Act
        result = await auth_service.update_username(new_username, token)

        # Assert
        assert result["id"] == current_user["id"]
        assert result["username"] == new_username
        assert result["role"] == current_user["role"]
        auth_service.logger.info.assert_called()

    @pytest.mark.asyncio
    async def test_sign_up_registration_failed(self, auth_service, mocker):
        """Test registration failure when no user is returned"""
        # Arrange
        user_data = UserCreateFactory()
        auth_service.admin_client.auth.admin.list_users.return_value = []
        auth_service.client.auth.sign_up.return_value = mocker.Mock(user=None)

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.sign_up(user_data)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Registration failed" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_sign_up_unexpected_error(self, auth_service):
        """Test registration with unexpected error"""
        # Arrange
        user_data = UserCreateFactory()
        auth_service.admin_client.auth.admin.list_users.side_effect = Exception(
            "Unexpected error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.sign_up(user_data)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Unexpected error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_sign_out_error(self, auth_service):
        """Test logout with error"""
        # Arrange
        access_token = "test-token"
        auth_service.client.auth.sign_out.side_effect = Exception(
            "Logout error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.sign_out(access_token)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Logout error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_reset_password_error(self, auth_service):
        """Test password reset with error"""
        # Arrange
        email = "test@example.com"
        auth_service.client.auth.reset_password_for_email.side_effect = Exception(
            "Reset error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.reset_password(email)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Reset error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_user_password_no_user(self, auth_service, mocker):
        """Test password update when no user is returned"""
        # Arrange
        mock_response = mocker.Mock(user=None)
        auth_service.client.auth.update_user.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.update_user_password("token", "refresh", "newpass")
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Password update failed" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_user_password_error(self, auth_service):
        """Test password update with error"""
        # Arrange
        auth_service.client.auth.update_user.side_effect = Exception(
            "Update error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.update_user_password("token", "refresh", "newpass")
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Update error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_error(self, auth_service):
        """Test getting current user with error"""
        # Arrange
        token = "test-token"
        auth_service.client.auth.get_user.side_effect = Exception(
            "Get user error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.get_current_user(token)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid token" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, auth_service, mocker):
        """Test successful token refresh"""
        # Arrange
        refresh_token = "test-refresh-token"
        mock_user = mocker.Mock(id="test-id")
        mock_session = mocker.Mock(access_token="new-test-token")
        auth_service.client.auth.refresh_session.return_value = mocker.Mock(
            user=mock_user,
            session=mock_session
        )

        # Act
        result = await auth_service.refresh_token(refresh_token)

        # Assert
        assert result["user"] == mock_user
        assert result["session"] == mock_session
        auth_service.logger.info.assert_called()

    @pytest.mark.asyncio
    async def test_refresh_token_error(self, auth_service):
        """Test token refresh with error"""
        # Arrange
        refresh_token = "test-refresh-token"
        auth_service.client.auth.refresh_session.side_effect = Exception(
            "Refresh error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.refresh_token(refresh_token)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid refresh token" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_delete_user_success(self, auth_service):
        """Test successful user deletion"""
        # Arrange
        user_id = "test-id"
        auth_service.admin_client.auth.admin.delete_user.return_value = None

        # Act
        result = await auth_service.delete_user(user_id)

        # Assert
        assert result["message"] == f"User {user_id} deleted successfully"
        auth_service.admin_client.auth.admin.delete_user.assert_called_once_with(
            user_id)

    @pytest.mark.asyncio
    async def test_delete_user_error(self, auth_service):
        """Test user deletion with error"""
        # Arrange
        user_id = "test-id"
        auth_service.admin_client.auth.admin.delete_user.side_effect = Exception(
            "Delete error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.delete_user(user_id)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Delete error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_list_users_error(self, auth_service):
        """Test listing users with error"""
        # Arrange
        auth_service.admin_client.auth.admin.list_users.side_effect = Exception(
            "List error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.list_users()
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "List error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_set_user_role_error(self, auth_service):
        """Test setting user role with error"""
        # Arrange
        user_id = "test-id"
        new_role = "admin"
        auth_service.admin_client.auth.admin.update_user_by_id.side_effect = Exception(
            "Role update error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.set_user_role(user_id, new_role)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Role update error" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_username_error(self, auth_service, mocker):
        """Test updating username with error"""
        # Arrange
        token = "test-token"
        new_username = "newusername"
        mocker.patch.object(
            auth_service,
            'get_current_user',
            return_value={"id": "test-id", "role": "user"}
        )
        auth_service.admin_client.auth.admin.update_user_by_id.side_effect = Exception(
            "Username update error")

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.update_username(new_username, token)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Username update error" in str(exc_info.value.detail)
