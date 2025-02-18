import pytest
from api.core.storage import StorageManager
from api.core.exceptions import (
    StorageConnectionError,
    StorageUploadError,
    StorageAccessError,
    StorageError
)
from api.tests.factories import TestFileFactory
import asyncio
import os
from api.core.config import settings
import io
from typing import List
from datetime import timedelta

@pytest.fixture(scope="session")
def live_gcp_settings():
    """验证 GCP 测试环境配置"""
    print("\nVerifying GCP settings...")  # 添加调试输出
    required_vars = {
        'GCP_PROJECT_ID': settings.GCP_PROJECT_ID,
        'GCP_BUCKET_NAME': settings.GCP_BUCKET_NAME,
        'GCP_CREDENTIALS_PATH': settings.GCP_CREDENTIALS_PATH
    }
    
    for key, value in required_vars.items():
        print(f"{key}: {value}")
    
    missing = [k for k, v in required_vars.items() if not v]
    if missing:
        pytest.skip(f"Missing required environment variables: {', '.join(missing)}")
    
    if not os.path.exists(settings.GCP_CREDENTIALS_PATH):
        pytest.skip(f"Credentials file not found at: {settings.GCP_CREDENTIALS_PATH}")
    
    return required_vars

@pytest.fixture
async def storage_manager(live_gcp_settings):
    """提供初始化好的 StorageManager 实例"""
    from api.core.config import Settings
    test_settings = Settings(
        GCP_PROJECT_ID=live_gcp_settings['GCP_PROJECT_ID'],
        GCP_BUCKET_NAME=live_gcp_settings['GCP_BUCKET_NAME'],
        GCP_CREDENTIALS_PATH=live_gcp_settings['GCP_CREDENTIALS_PATH']
    )
    manager = StorageManager(settings=test_settings)
    await manager._ensure_initialized()
    return manager

@pytest.fixture
def invalid_storage_manager():
    """提供配置错误的 StorageManager 实例"""
    from api.core.config import Settings
    invalid_settings = Settings(
        GCP_PROJECT_ID="invalid-project",
        GCP_BUCKET_NAME="non-existent-bucket-name-123",
        GCP_CREDENTIALS_PATH="invalid/path.json"
    )
    return StorageManager(settings=invalid_settings)

@pytest.fixture
def cleanup_files():
    """管理测试文件的清理"""
    files_to_cleanup: List[str] = []
    yield files_to_cleanup
    
    async def cleanup():
        manager = StorageManager()
        await manager._ensure_initialized()
        for file_path in files_to_cleanup:
            try:
                if await manager.file_exists(file_path):
                    await manager.delete_file(file_path)
            except Exception as e:
                print(f"Failed to cleanup {file_path}: {e}")
    
    asyncio.run(cleanup())

class TestGCPStorage:
    """GCP存储集成测试"""

    class TestBasicOperations:
        """基本操作测试"""
        
        @pytest.mark.asyncio
        async def test_pdf_upload_and_access(self, storage_manager, cleanup_files):
            """测试PDF文件上传和访问的完整流程"""
            test_file = TestFileFactory.create_pdf()
            try:
                with open(test_file, 'rb') as f:
                    file_path = await storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf'
                    )
                    cleanup_files.append(file_path)

                assert await storage_manager.file_exists(file_path)
                url = await storage_manager.get_signed_url(file_path)
                assert url.startswith('https://')
                
                metadata = await storage_manager.get_metadata(file_path)
                assert metadata.get('contentType') == 'application/pdf'
                
                content = await storage_manager.get_file_content(file_path)
                assert len(content) > 0
            finally:
                os.unlink(test_file)

    class TestMetadataOperations:
        """元数据操作测试"""
        
        @pytest.mark.asyncio
        async def test_file_lifecycle(self, storage_manager, cleanup_files):
            """测试文件生命周期，包括元数据管理"""
            test_file = TestFileFactory.create_pdf()
            try:
                # 上传
                with open(test_file, 'rb') as f:
                    file_path = await storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf',
                        metadata={'test-key': 'test-value'}
                    )
                    cleanup_files.append(file_path)

                # 验证元数据
                metadata = await storage_manager.get_metadata(file_path)
                assert metadata.get('test-key') == 'test-value'

                # 更新元数据
                await storage_manager.update_metadata(file_path, {'new-key': 'new-value'})
                updated_metadata = await storage_manager.get_metadata(file_path)
                assert updated_metadata.get('new-key') == 'new-value'

                # 删除
                await storage_manager.delete_file(file_path)
                cleanup_files.remove(file_path)
                
                # 验证删除成功
                assert not await storage_manager.file_exists(file_path)

            finally:
                os.unlink(test_file)

    class TestLimitsAndRestrictions:
        """限制和约束测试"""
        
        @pytest.mark.asyncio
        async def test_large_file_upload(self, storage_manager):
            """测试大文件上传限制"""
            large_file = TestFileFactory.create_large_file(60)  # 60MB
            try:
                with open(large_file, 'rb') as f:
                    with pytest.raises(Exception) as exc_info:
                        await storage_manager.upload_file(
                            file=f,
                            content_type='application/pdf'
                        )
                    assert "file size" in str(exc_info.value).lower()
            finally:
                os.unlink(large_file)

        @pytest.mark.asyncio
        async def test_mime_type_restrictions(self, storage_manager):
            """测试MIME类型限制"""
            test_file = TestFileFactory.create_file('text/plain')
            try:
                with open(test_file, 'rb') as f:
                    with pytest.raises(Exception) as exc_info:
                        await storage_manager.upload_file(
                            file=f,
                            content_type='text/plain'
                        )
                    assert "content type" in str(exc_info.value).lower()
            finally:
                os.unlink(test_file)

    class TestConcurrency:
        """并发操作测试"""
        
        @pytest.mark.asyncio
        async def test_concurrent_uploads(self, storage_manager, cleanup_files):
            """测试并发上传操作"""
            test_files = [TestFileFactory.create_pdf() for _ in range(3)]
            upload_tasks = []
            
            try:
                for test_file in test_files:
                    async def upload_file(file_path):
                        with open(file_path, 'rb') as f:
                            content = f.read()  # 先读取内容
                        return await storage_manager.upload_file(
                            file=io.BytesIO(content),  # 使用BytesIO避免文件锁定问题
                            content_type='application/pdf'
                        )
                            
                    upload_tasks.append(upload_file(test_file))
                
                results = await asyncio.gather(*upload_tasks, return_exceptions=True)
                successful_results = [r for r in results if isinstance(r, str)]
                assert len(successful_results) > 0
                
            finally:
                # 清理测试文件
                for test_file in test_files:
                    try:
                        if os.path.exists(test_file):
                            os.remove(test_file)
                    except Exception:
                        pass  # 忽略清理错误 

    class TestErrorHandling:
        """错误处理测试"""
        
        @pytest.mark.asyncio
        async def test_bucket_not_exists(self):
            """测试存储桶不存在的情况"""
            # 创建一个新的 StorageManager 实例，使用不存在的存储桶
            invalid_settings = settings.model_copy()  # 使用新的 model_copy 方法
            invalid_settings.GCP_BUCKET_NAME = "non-existent-bucket-name-123"
            
            storage_manager = StorageManager()
            storage_manager._settings = invalid_settings
            
            with pytest.raises(StorageConnectionError) as exc_info:
                await storage_manager._ensure_initialized()
            assert "does not exist" in str(exc_info.value)

        @pytest.mark.asyncio
        async def test_invalid_expiration(self, storage_manager, cleanup_files):
            """测试无效的URL过期时间"""
            test_file = TestFileFactory.create_pdf()
            try:
                with open(test_file, 'rb') as f:
                    file_path = await storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf'
                    )
                    cleanup_files.append(file_path)
                
                # 测试负数过期时间
                with pytest.raises(StorageUploadError) as exc_info:
                    await storage_manager.get_signed_url(file_path, expiration=timedelta(seconds=-1))
                assert "must be positive" in str(exc_info.value)
                
                # 测试超过7天的过期时间
                with pytest.raises(StorageUploadError) as exc_info:
                    await storage_manager.get_signed_url(file_path, expiration=timedelta(days=8))
                assert "cannot exceed 7 days" in str(exc_info.value)
            finally:
                os.unlink(test_file)

    class TestHealthCheck:
        """健康检查测试"""
        
        @pytest.mark.asyncio
        async def test_health_check(self, storage_manager):
            """测试健康检查功能"""
            # 正常情况
            assert await storage_manager.check_health() is True
            
            # 模拟错误情况
            storage_manager._bucket = None
            assert await storage_manager.check_health() is False 