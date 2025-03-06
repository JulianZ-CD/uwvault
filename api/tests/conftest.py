import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.core.config import get_settings, Settings
from api.services.todo_service import TodoService
from api.services.auth_service import AuthService
import os


@pytest.fixture
def test_settings():
    """Override settings for testing"""
    return Settings(
        SUPABASE_URL="https://test-url.supabase.co",
        SUPABASE_KEY="test-key"
    )


@pytest.fixture
def test_client():
    """Create a test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def todo_service(mocker):
    """Create a mocked TodoService"""
    service = TodoService()
    # Mock Supabase client
    mocker.patch.object(service, 'supabase')
    return service


@pytest.fixture
async def admin_token(test_client):
    """obtain admin token for cleanup operations"""
    auth_service = AuthService()
    admin_credentials = {
        "email": os.getenv("ADMIN_EMAIL"),
        "password": os.getenv("ADMIN_PASSWORD")
    }
    response = await auth_service.sign_in(admin_credentials)
    return response["session"]["access_token"]


@pytest.fixture(scope="function")
async def cleanup_users(admin_token):
    test_emails = []
    test_emails.append(admin_token["email"])  # add admin user to cleanup list
    yield test_emails

    auth_service = AuthService()
    # use admin token for cleanup
    users = await auth_service.list_users()
    for user in users:
        if user["email"].endswith("@example.com"):
            try:
                await auth_service.delete_user(user["id"])
                print(f"Successfully deleted user: {user['email']}")
            except Exception as e:
                print(f"Failed to delete test user {user['email']}: {e}")
