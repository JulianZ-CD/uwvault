import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.core.config import get_settings, Settings
from api.services.todo_service import TodoService

from supabase import create_client
from api.index import app
from api.services.resource_service import ResourceService, FILE_SIZE_LIMIT, ResourceType
from api.services.todo_service import TodoService
from fastapi import UploadFile
from unittest.mock import Mock
from io import BytesIO

settings = get_settings()

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

TEST_USER = {
    "email": settings.USER_EMAIL,
    "password": settings.USER_PASSWORD
}

def get_auth_headers(test_db):
    """Get authentication headers for test user"""
    auth_response = test_db.auth.sign_in_with_password(TEST_USER)
    return {"Authorization": f"Bearer {auth_response.session.access_token}"}

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