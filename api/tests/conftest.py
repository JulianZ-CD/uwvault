import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.core.config import get_settings, Settings
from api.services.todo_service import TodoService
from api.services.auth_service import AuthService
import os

from supabase import create_client
from api.index import app
from api.services.resource_service import ResourceService, FILE_SIZE_LIMIT, ResourceType
from api.services.todo_service import TodoService
from fastapi import UploadFile
from unittest.mock import Mock
from io import BytesIO

import uuid
from api.services.auth_service import AuthService
from api.tests.factories import UserCreateFactory, AdminUserCreateFactory
import json
import jwt
from datetime import datetime, timedelta
from fastapi import status
from pydantic import BaseModel

settings = get_settings()

@pytest.fixture(scope="session")
def test_settings():
    """测试环境配置"""
    settings = get_settings()
    settings.TESTING = True
    return settings

@pytest.fixture(autouse=True)
def setup_test_env(test_settings):
    """设置测试环境"""
    # 确保使用测试配置
    yield

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

<<<<<<< HEAD
TEST_USER = {
    "email": settings.USER_EMAIL,
    "password": settings.USER_PASSWORD
}

@pytest.fixture
async def regular_user_headers(test_client):
    """获取普通用户的认证头"""
    try:
        # 使用已存在的普通用户账户
        login_response = test_client.post("/api/py/auth/login", json={
            "email": "ljytest@gmail.com",  # 替换为实际的普通用户邮箱
            "password": "12345678"   # 替换为实际的普通用户密码
        })
        assert login_response.status_code == status.HTTP_200_OK
        
        access_token = login_response.json()["session"]["access_token"]
        user_id = login_response.json()["user"]["id"]
        
        return {"Authorization": f"Bearer {access_token}"}, user_id
        
    except Exception as e:
        pytest.fail(f"Failed to get regular user headers: {e}")

@pytest.fixture
async def admin_user_headers(test_client):
    """获取管理员用户的认证头"""
    try:
        # 使用已存在的管理员账户
        login_response = test_client.post("/api/py/auth/login", json={
            "email": "ziyuwangca123456@gmail.com",  # 替换为实际的管理员邮箱
            "password": "12345678"   # 替换为实际的管理员密码
        })
        assert login_response.status_code == status.HTTP_200_OK
        
        access_token = login_response.json()["session"]["access_token"]
        user_id = login_response.json()["user"]["id"]
        
        return {"Authorization": f"Bearer {access_token}"}, user_id
        
    except Exception as e:
        pytest.fail(f"Failed to get admin headers: {e}")

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
def resource_service():
    """create resource service instance for testing"""
    service = ResourceService()
    service.table_name = 'resources'
    return service

@pytest.fixture
def storage_manager(resource_service):
    """Create a storage manager from resource service"""
    return resource_service

@pytest.fixture
def test_file():
    """Create a test file fixture"""
    return {
        "filename": "test.pdf",
        "content": b"test content",
        "content_type": "application/pdf",
        "size": 1024
    }

@pytest.fixture
def test_resource_data():
    """Create test resource data"""
    return {
        "title": "Test Resource",
        "description": "Test Description",
        "course_id": "ece 657",
        "file_type": "pdf",
        "file_size": FILE_SIZE_LIMIT // 2,
        "mime_type": "application/pdf",
        "storage_path": f"{ResourceType.RESOURCE_FILE.value}/2024/01/test_file.pdf",
    }

@pytest.fixture
async def admin_token(supabase_client):
    """Create admin user and get token using service role"""
    admin_data = {
        "email": "admin@test.com",
        "password": "admin123",
        "user_metadata": {
            "is_admin": True
        }
    }
    
    try:
        # use service role to create admin user
        response = await supabase_client.auth.admin.create_user(admin_data)
        user = response.user
        
        # get access token
        auth_response = await supabase_client.auth.sign_in_with_password({
            "email": admin_data["email"],
            "password": admin_data["password"]
        })
        
        return auth_response.session.access_token
        
    except Exception as e:
        pytest.fail(f"Failed to create admin user: {str(e)}")

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

# Mock User for testing
class MockUser(BaseModel):
    """Mock user model for testing"""
    id: int
    username: str
    is_admin: bool = False

@pytest.fixture
def mock_normal_user():
    """Mock normal user for testing"""
    return MockUser(
        id=1,
        username="test_user",
        is_admin=False
    )

@pytest.fixture
def mock_admin_user():
    """Mock admin user for testing"""
    return MockUser(
        id=999,
        username="admin",
        is_admin=True
    )

@pytest.fixture
def get_current_user():
    """Mock current user function for testing"""
    async def _get_current_user():
        return MockUser(
            id=1,
            username="test_user",
            is_admin=False
        )
    return _get_current_user

@pytest.fixture
def require_admin():
    """Mock require admin function for testing"""
    async def _require_admin():
        return MockUser(
            id=999,
            username="admin",
            is_admin=True
        )
    return _require_admin
=======

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
>>>>>>> main
