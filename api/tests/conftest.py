import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.core.config import get_settings, Settings
from api.services.todo_service import TodoService
from api.services.auth_service import AuthService
import os
from supabase import create_client
from api.models.resource import ResourceType, ResourceStatus, StorageStatus
from api.services.resource_service import ResourceService, FILE_SIZE_LIMIT
from api.services.todo_service import TodoService
from fastapi import UploadFile
from unittest.mock import Mock
from io import BytesIO
from api.services.auth_service import AuthService
from datetime import datetime
from fastapi import status
from pydantic import BaseModel

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

@pytest.fixture(scope="function")
async def test_db():
    """setup test database"""
    try:
        settings = get_settings()
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
        yield client
    except Exception as e:
        raise

@pytest.fixture
async def regular_user_headers(test_client):
    try:
        settings = get_settings()
        login_response = test_client.post("/api/py/auth/login", json={
            "email": settings.USER_EMAIL,
            "password": settings.USER_PASSWORD
        })
        assert login_response.status_code == status.HTTP_200_OK
        
        access_token = login_response.json()["session"]["access_token"]
        user_id = login_response.json()["user"]["id"]
        
        return {"Authorization": f"Bearer {access_token}"}, user_id
        
    except Exception as e:
        pytest.fail(f"Failed to get regular user headers: {e}")

@pytest.fixture
async def admin_user_headers(test_client):
    try:
        settings = get_settings()
        login_response = test_client.post("/api/py/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        assert login_response.status_code == status.HTTP_200_OK
        
        access_token = login_response.json()["session"]["access_token"]
        user_id = login_response.json()["user"]["id"]
        
        return {"Authorization": f"Bearer {access_token}"}, user_id
        
    except Exception as e:
        pytest.fail(f"Failed to get admin headers: {e}")

@pytest.fixture
def resource_service():
    """Create a real ResourceService"""
    service = ResourceService()
    return service

class MockUser(BaseModel):
    id: str
    username: str
    is_admin: bool = False
    
    def get(self, key, default=None):
        if key == "role":
            return "admin" if self.is_admin else "user"
        if hasattr(self, key):
            return getattr(self, key)
        return default
    
    def __getitem__(self, key):
        """Support dictionary-like access"""
        return getattr(self, key)

@pytest.fixture
def mock_supabase(mocker):
    """Mock Supabase client"""
    mock_client = mocker.Mock()
    mock_table = mocker.Mock()
    
    # correctly set table method
    mock_client.table = mocker.Mock(return_value=mock_table)
    
    # mock table operation method chain
    mock_table.select = mocker.Mock(return_value=mock_table)
    mock_table.insert = mocker.Mock(return_value=mock_table)
    mock_table.update = mocker.Mock(return_value=mock_table)
    mock_table.delete = mocker.Mock(return_value=mock_table)
    mock_table.eq = mocker.Mock(return_value=mock_table)
    mock_table.order = mocker.Mock(return_value=mock_table)
    mock_table.limit = mocker.Mock(return_value=mock_table)
    mock_table.offset = mocker.Mock(return_value=mock_table)
    mock_table.single = mocker.Mock(return_value=mock_table)
    
    # set execute method
    mock_execute = mocker.Mock()
    mock_execute.data = []
    mock_execute.count = 0
    mock_table.execute = mocker.Mock(return_value=mock_execute)
    
    return mock_client

@pytest.fixture
def mock_file():
    """Create a mock file for testing"""
    file = Mock(spec=UploadFile)
    file.filename = "test.pdf"
    file.content_type = "application/pdf"
    file.file = BytesIO(b"test content")
    file.size = 1024
    return file

@pytest.fixture
def mock_gcp_storage(mocker):
    """Mock GCP storage bucket and blob"""
    mock_storage_bucket = mocker.Mock()
    mock_blob = mocker.Mock()
    mock_storage_bucket.blob = mocker.Mock(return_value=mock_blob)
    mock_blob.exists = mocker.Mock(return_value=True)
    mock_blob.delete = mocker.Mock()
    mock_blob.upload_from_file = mocker.Mock()
    mock_blob.generate_signed_url = mocker.Mock(return_value="https://storage.googleapis.com/test-url")
    
    return {
        "bucket": mock_storage_bucket,
        "blob": mock_blob
    }

@pytest.fixture
def mock_normal_user():
    """Mock normal user for testing"""
    return MockUser(
        id="user-123",
        username="test_user",
        is_admin=False
    )

@pytest.fixture
def mock_admin_user():
    """Mock admin user for testing"""
    return MockUser(
        id="admin-999",
        username="admin",
        is_admin=True
    )

@pytest.fixture
def get_current_user():
    """Mock current user function for testing"""
    async def _get_current_user():
        return MockUser(
            id="user-123",
            username="test_user",
            is_admin=False
        )
    return _get_current_user

@pytest.fixture
def require_admin():
    """Mock require admin function for testing"""
    async def _require_admin():
        return MockUser(
            id="admin-999",
            username="admin",
            is_admin=True
        )
    return _require_admin

@pytest.fixture
def mock_resource_rating_response():
    """create mock resource rating response"""
    return {
        "resource_id": 1,
        "user_id": "test-user",
        "rating": 4.5,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

@pytest.fixture
def mock_resource_with_ratings():
    """create mock resource with ratings"""
    return {
        "id": 1,
        "title": "Test Resource",
        "description": "Test Description",
        "status": "approved",
        "average_rating": 4.2,
        "rating_count": 5
    }

@pytest.fixture
def mock_resources():
    """create mock resource data list"""
    return [
        {
            "id": 1,
            "title": "Resource 1",
            "description": "Description 1",
            "course_id": "ECE 651",
            "status": ResourceStatus.APPROVED.value,
            "storage_status": StorageStatus.SYNCED.value,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_type": "pdf",
            "storage_path": "test/path/file1.pdf",
            "is_active": True,
            "created_by": "user-id",
            "updated_by": "user-id"
        },
        {
            "id": 2,
            "title": "Resource 2",
            "description": "Description 2",
            "course_id": "CS 446",
            "status": ResourceStatus.APPROVED.value,
            "storage_status": StorageStatus.SYNCED.value,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_type": "pdf",
            "storage_path": "test/path/file2.pdf",
            "is_active": True,
            "created_by": "user-id",
            "updated_by": "user-id"
        }
    ]
