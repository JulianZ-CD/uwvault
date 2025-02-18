import os
import json
import pytest
from unittest.mock import Mock, AsyncMock
from google.cloud import storage
from api.core.config import settings

# 设置所有必需的环境变量
os.environ.update({
    # GCP Settings
    'GCP_PROJECT_ID': 'test-project',
    'GCP_BUCKET_NAME': 'test-bucket',
    'GCP_CREDENTIALS_PATH': 'test/credentials.json',
    
    # 文件类型配置
    'ALLOWED_MIME_TYPES': '["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]',  # JSON 格式
    'FILE_SIZE_LIMITS': '{"application/pdf": 52428800, "application/msword": 31457280, "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 31457280}',
    
    # 基础配置
    'PROJECT_NAME': 'UWvault-Test',
    'DEBUG': 'false',
    'API_PREFIX': '/api/py',
    
    # 测试标记
    'TESTING': 'true'
})

# 创建测试配置类
class TestConfig:
    GCP_PROJECT_ID = 'test-project'
    GCP_BUCKET_NAME = 'test-bucket'
    GCP_CREDENTIALS_PATH = 'test/credentials.json'
    PROJECT_NAME = 'UWvault-Test'
    DEBUG = False
    API_PREFIX = '/api/py'

# 导入和初始化设置
from api.core.config import Settings
settings = Settings.model_validate(TestConfig(), from_attributes=True)

# 导入其他模块
from api.core.storage import StorageManager
from api.core.exceptions import StorageConnectionError, StorageUploadError, StorageAccessError

@pytest.fixture
def mock_storage_client(mocker):
    """Mock GCP存储客户端"""
    mock_client = Mock(spec=storage.Client)
    mock_bucket = Mock(spec=storage.Bucket)
    mock_client.bucket.return_value = mock_bucket
    mocker.patch('google.cloud.storage.Client', return_value=mock_client)
    return mock_client

@pytest.fixture
def mock_bucket(mock_storage_client):
    """Mock GCP存储桶"""
    return mock_storage_client.bucket.return_value

@pytest.fixture
def mock_blob(mock_bucket):
    """Mock GCP存储对象"""
    mock_blob = Mock()
    mock_bucket.blob.return_value = mock_blob
    return mock_blob

@pytest.fixture
async def storage_manager():
    """创建存储管理器实例"""
    return StorageManager()

@pytest.fixture
async def initialized_storage_manager(storage_manager, mock_storage_client):
    """创建已初始化的存储管理器"""
    mock_storage_client.bucket.return_value.exists.return_value = True
    await storage_manager._ensure_initialized()
    return storage_manager

@pytest.fixture
def valid_file_content():
    """创建有效的文件内容"""
    return b"Test file content"

@pytest.fixture
def valid_file_metadata():
    """创建有效的文件元数据"""
    return {
        "content-type": "application/pdf",
        "original-filename": "test.pdf",
        "upload-date": "2024-01-01"
    }

@pytest.fixture(scope="session")
def live_gcp_settings():
    """验证 GCP 测试环境配置"""
    print("\nChecking GCP configuration:")
    
    # 检查环境变量
    required_vars = {
        'GCP_PROJECT_ID': settings.GCP_PROJECT_ID,
        'GCP_BUCKET_NAME': settings.GCP_BUCKET_NAME,
        'GCP_CREDENTIALS_PATH': settings.GCP_CREDENTIALS_PATH
    }
    
    # 打印当前配置
    for key, value in required_vars.items():
        print(f"{key}: {value}")
    
    # 检查凭据文件
    cred_path = settings.GCP_CREDENTIALS_PATH
    print(f"\nChecking credentials file at: {cred_path}")
    print(f"File exists: {os.path.exists(cred_path)}")
    
    # 检查是否有缺失的变量
    missing = [k for k, v in required_vars.items() if not v]
    if missing:
        reason = f"Missing required environment variables: {', '.join(missing)}"
        print(f"\nSkipping tests: {reason}")
        pytest.skip(reason)
    
    # 检查凭据文件是否存在
    if not os.path.exists(cred_path):
        reason = f"Credentials file not found at: {cred_path}"
        print(f"\nSkipping tests: {reason}")
        pytest.skip(reason)
    
    print("\nAll checks passed!")
    return required_vars

@pytest.fixture
def cleanup_test_files():
    """测试文件清理fixture"""
    uploaded_files = []
    yield uploaded_files
    
    # 清理所有上传的测试文件
    async def cleanup():
        storage = StorageManager()
        for file_path in uploaded_files:
            try:
                await storage.delete_file(file_path)
            except Exception as e:
                print(f"Failed to cleanup file {file_path}: {e}")
    
    import asyncio
    asyncio.run(cleanup())
