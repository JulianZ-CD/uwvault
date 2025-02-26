import pytest
from api.models.user import UserCreate, UserLogin, UserUpdate, PasswordUpdateRequest


@pytest.mark.unit
class TestUserCreate:
    def test_user_create_success(self):
        """Test successful UserCreate model creation"""
        user_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "username": "testuser",
            "is_active": True,
            "is_superuser": False,
            "is_verified": False,
            "redirect_url": "https://example.com/verify"
        }
        user = UserCreate(**user_data)
        assert user.email == user_data["email"]
        assert user.password == user_data["password"]
        assert user.username == user_data["username"]
        assert user.is_active == user_data["is_active"]
        assert user.is_superuser == user_data["is_superuser"]
        assert user.is_verified == user_data["is_verified"]
        assert user.redirect_url == user_data["redirect_url"]

    @pytest.mark.parametrize("invalid_data", [
        {"email": "", "password": "SecurePass123!",
            "username": "test"},  # Empty email
        {"email": "invalid-email", "password": "SecurePass123!",
            "username": "test"},  # Invalid email
        {"email": "test@example.com", "password": "short",
            "username": "test"},  # Password too short
        {"email": "test@example.com", "password": "SecurePass123!",
            "username": "ab"},  # Username too short
        {"email": "test@example.com", "password": "SecurePass123!",
            "username": "a" * 51},  # Username too long
    ])
    def test_user_create_validation_errors(self, invalid_data):
        """Test UserCreate validation constraints"""
        with pytest.raises(ValueError):
            UserCreate(**invalid_data)


@pytest.mark.unit
class TestUserLogin:
    def test_user_login_success(self):
        """Test successful UserLogin model creation"""
        login_data = {
            "email": "test@example.com",
            "password": "SecurePass123!"
        }
        user_login = UserLogin(**login_data)
        assert user_login.email == login_data["email"]
        assert user_login.password == login_data["password"]

    @pytest.mark.parametrize("invalid_data", [
        {"email": "test@example.com"},  # Missing password
        {"password": "SecurePass123!"},  # Missing email
        {"email": "invalid-email", "password": "SecurePass123!"},  # Invalid email
    ])
    def test_user_login_validation_errors(self, invalid_data):
        """Test UserLogin validation constraints"""
        with pytest.raises(ValueError):
            UserLogin(**invalid_data)


@pytest.mark.unit
class TestUserUpdate:
    def test_user_update_success(self):
        """Test successful UserUpdate model creation"""
        update_data = {
            "username": "newusername",
            "avatar_url": "https://example.com/avatar.jpg",
            "bio": "New bio",
            "is_active": True,
            "is_verified": True
        }
        user_update = UserUpdate(**update_data)
        assert user_update.username == update_data["username"]
        assert user_update.avatar_url == update_data["avatar_url"]
        assert user_update.bio == update_data["bio"]
        assert user_update.is_active == update_data["is_active"]
        assert user_update.is_verified == update_data["is_verified"]

    @pytest.mark.parametrize("invalid_data", [
        {"username": "ab"},  # Username too short
        {"username": "a" * 51},  # Username too long
        {"bio": "x" * 501},  # Bio too long
    ])
    def test_user_update_validation_errors(self, invalid_data):
        """Test UserUpdate validation constraints"""
        with pytest.raises(ValueError):
            UserUpdate(**invalid_data)


@pytest.mark.unit
class TestPasswordUpdateRequest:
    def test_password_update_request_success(self):
        """Test successful PasswordUpdateRequest model creation"""
        update_data = {
            "access_token": "valid-access-token",
            "refresh_token": "valid-refresh-token",
            "new_password": "NewSecurePass123!"
        }
        password_update = PasswordUpdateRequest(**update_data)
        assert password_update.access_token == update_data["access_token"]
        assert password_update.refresh_token == update_data["refresh_token"]
        assert password_update.new_password == update_data["new_password"]

    @pytest.mark.parametrize("invalid_data", [
        {
            "refresh_token": "valid-token",
            "new_password": "NewSecurePass123!"
        },  # Missing access_token
        {
            "access_token": "valid-token",
            "new_password": "NewSecurePass123!"
        },  # Missing refresh_token
        {
            "access_token": "valid-token",
            "refresh_token": "valid-token",
        },  # Missing new_password
    ])
    def test_password_update_request_validation_errors(self, invalid_data):
        """Test PasswordUpdateRequest validation constraints"""
        with pytest.raises(ValueError):
            PasswordUpdateRequest(**invalid_data)
