import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.core.config import get_settings, Settings
from api.services.todo_service import TodoService

from supabase import create_client
from api.index import app
from api.services.resource_service import ResourceService
from api.services.todo_service import TodoService
from api.core.storage import StorageManager
from api.utils.file_handlers import FILE_SIZE_LIMIT,ResourceType

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

# 从环境变量获取测试用户凭据
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
    """设置测试数据库"""
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
    """创建资源服务实例用于测试"""
    service = ResourceService()
    service.table_name = 'resources'
    return service

@pytest.fixture
def storage_manager():
    """Create a real StorageManager instance"""
    return StorageManager()

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
        # 使用 service role 创建管理员用户
        response = await supabase_client.auth.admin.create_user(admin_data)
        user = response.user
        
        # 获取访问令牌
        auth_response = await supabase_client.auth.sign_in_with_password({
            "email": admin_data["email"],
            "password": admin_data["password"]
        })
        
        return auth_response.session.access_token
        
    except Exception as e:
        pytest.fail(f"Failed to create admin user: {str(e)}")