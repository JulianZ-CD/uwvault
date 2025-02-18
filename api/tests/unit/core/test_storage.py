import pytest
from datetime import timedelta
from unittest.mock import Mock
from google.auth import exceptions
from google.cloud import storage
import asyncio
from pathlib import Path

from api.core.storage import StorageManager
from api.core.exceptions import (
    StorageError,
    StorageConnectionError,
    StorageUploadError,
    StorageAccessError
)
from api.core.config import settings, Settings, get_settings
from api.tests.factories import TestFileFactory

@pytest.mark.unit
class TestStorageExceptions:
    """存储异常测试"""

    def test_storage_exceptions(self):
        """测试存储相关异常"""
        # 基础存储异常
        error = StorageError("Test error")
        assert str(error) == "Test error"
        
        # 连接异常
        conn_error = StorageConnectionError("Connection failed")
        assert isinstance(conn_error, StorageError)
        assert str(conn_error) == "Connection failed"
        
        # 上传异常
        upload_error = StorageUploadError("Upload failed")
        assert isinstance(upload_error, StorageError)
        assert str(upload_error) == "Upload failed"
        
        # 访问异常
        access_error = StorageAccessError("Access denied")
        assert isinstance(access_error, StorageError)
        assert str(access_error) == "Access denied"

@pytest.mark.unit
class TestStorageManager:
    """存储管理器单元测试"""

    @pytest.mark.asyncio
    async def test_successful_initialization(self, storage_manager, mock_bucket):
        """测试成功初始化"""
        mock_bucket.exists.return_value = True
        
        await storage_manager._ensure_initialized()
        
        assert storage_manager._client is not None
        assert storage_manager._bucket is not None
        assert storage_manager._bucket.name == settings.GCP_BUCKET_NAME
    
    @pytest.mark.asyncio
    async def test_initialization_bucket_not_exists(self, storage_manager, mock_bucket):
        """测试存储桶不存在的情况"""
        mock_bucket.exists.return_value = False
        
        with pytest.raises(StorageConnectionError) as exc_info:
            await storage_manager._ensure_initialized()
        
        assert str(exc_info.value) == f"Bucket {settings.GCP_BUCKET_NAME} does not exist"
    
    @pytest.mark.asyncio
    async def test_initialization_auth_error(self, storage_manager, mocker):
        """测试认证错误"""
        mocker.patch('google.cloud.storage.Client',
                    side_effect=exceptions.DefaultCredentialsError("Invalid credentials"))
        
        with pytest.raises(StorageConnectionError) as exc_info:
            await storage_manager._ensure_initialized()
        
        assert "Invalid credentials" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_file_success(self, initialized_storage_manager, mock_bucket):
        """测试文件上传成功"""
        test_file = TestFileFactory.create_pdf()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        
        try:
            with open(test_file, 'rb') as f:
                blob_name = await initialized_storage_manager.upload_file(
                    file=f,
                    content_type='application/pdf'
                )
            
            assert blob_name is not None
            mock_blob.upload_from_file.assert_called_once()
        finally:
            test_file.unlink()
    
    @pytest.mark.asyncio
    async def test_upload_invalid_content_type(self, initialized_storage_manager):
        """测试上传无效内容类型的文件"""
        test_file = TestFileFactory.create_pdf()
        
        try:
            with open(test_file, 'rb') as f:
                with pytest.raises(StorageUploadError) as exc_info:
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='invalid/type'
                    )
            
            assert "Invalid content type" in str(exc_info.value)
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_upload_file_failure(self, initialized_storage_manager, mock_bucket):
        """测试文件上传失败"""
        test_file = TestFileFactory.create_pdf()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.upload_from_file.side_effect = Exception("Upload failed")
        
        try:
            with open(test_file, 'rb') as f:
                with pytest.raises(StorageUploadError) as exc_info:
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf'
                    )
            
            assert "Failed to upload file" in str(exc_info.value)
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_get_signed_url_success(self, initialized_storage_manager, mock_bucket):
        """测试成功生成签名URL"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.generate_signed_url.return_value = "https://test-url"
        
        url = await initialized_storage_manager.get_signed_url(
            "test.pdf",
            expiration=timedelta(hours=1)
        )
        
        assert url == "https://test-url"
        mock_blob.generate_signed_url.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_signed_url_not_found(self, initialized_storage_manager, mock_bucket):
        """测试获取不存在文件的签名URL"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = False
        
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.get_signed_url("nonexistent.pdf")
        
        assert "File not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_signed_url_failure(self, initialized_storage_manager, mock_bucket):
        """测试签名URL生成失败"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        mock_blob.generate_signed_url.side_effect = Exception("URL generation failed")
        
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.get_signed_url("test.pdf")
        
        assert "Failed to get signed URL" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_health_check_success(self, initialized_storage_manager, mock_bucket):
        """测试健康检查成功"""
        mock_bucket.exists.return_value = True
        
        is_healthy = await initialized_storage_manager.check_health()
        
        assert is_healthy is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, initialized_storage_manager, mock_bucket):
        """测试健康检查失败"""
        mock_bucket.exists.side_effect = Exception("Connection error")
        
        is_healthy = await initialized_storage_manager.check_health()
        
        assert is_healthy is False

    @pytest.mark.asyncio
    async def test_initialization_failure_logging(self, storage_manager, mock_bucket, mocker):
        """测试初始化失败时的日志记录"""
        error_logger = mocker.patch.object(storage_manager.logger, 'error')
        mock_bucket.exists.side_effect = Exception("Initialization error")
        
        with pytest.raises(StorageConnectionError):
            await storage_manager._ensure_initialized()
        
        error_logger.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_failure_logging(self, initialized_storage_manager, mock_bucket, mocker):
        """测试上传失败时的日志记录"""
        error_logger = mocker.patch.object(initialized_storage_manager.logger, 'error')
        test_file = TestFileFactory.create_pdf()
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.upload_from_file.side_effect = Exception("Upload failed")
        
        try:
            with open(test_file, 'rb') as f:
                with pytest.raises(StorageUploadError):
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf'
                    )
            
            error_logger.assert_called_once()
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_delete_file_success(self, initialized_storage_manager, mock_bucket):
        """测试成功删除文件"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        
        result = await initialized_storage_manager.delete_file("test.pdf")
        
        assert result is True
        mock_blob.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_file_not_found(self, initialized_storage_manager, mock_bucket):
        """测试删除不存在的文件"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = False
        
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.delete_file("nonexistent.pdf")
        
        assert "File not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_file_exists_true(self, initialized_storage_manager, mock_bucket):
        """测试文件存在检查 - 存在"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        
        result = await initialized_storage_manager.file_exists("test.pdf")
        
        assert result is True

    @pytest.mark.asyncio
    async def test_file_exists_false(self, initialized_storage_manager, mock_bucket):
        """测试文件存在检查 - 不存在"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = False
        
        result = await initialized_storage_manager.file_exists("nonexistent.pdf")
        
        assert result is False

    @pytest.mark.asyncio
    async def test_get_file_metadata_success(self, initialized_storage_manager, mock_bucket):
        """测试获取文件元数据成功"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        mock_blob.metadata = {"custom_key": "custom_value"}
        
        metadata = await initialized_storage_manager.get_file_metadata("test.pdf")
        
        assert metadata == mock_blob.metadata

    @pytest.mark.asyncio
    async def test_get_file_metadata_not_found(self, initialized_storage_manager, mock_bucket):
        """测试获取不存在文件的元数据"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = False
        
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.get_file_metadata("nonexistent.pdf")
        
        assert "File not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_upload_file_with_custom_path(self, initialized_storage_manager, mock_bucket):
        """测试使用自定义路径上传文件"""
        test_file = TestFileFactory.create_pdf()
        custom_path = "custom/path/test.pdf"
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        
        try:
            with open(test_file, 'rb') as f:
                result = await initialized_storage_manager.upload_file(
                    file=f,
                    content_type='application/pdf',
                    file_path=custom_path
                )
            
            assert result == custom_path
            mock_bucket.blob.assert_called_with(custom_path)
            mock_blob.upload_from_file.assert_called_once()
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_upload_file_with_metadata(self, initialized_storage_manager, mock_bucket):
        """测试上传带元数据的文件"""
        test_file = TestFileFactory.create_pdf()
        metadata = {"author": "test", "version": "1.0"}
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        
        try:
            with open(test_file, 'rb') as f:
                await initialized_storage_manager.upload_file(
                    file=f,
                    content_type='application/pdf',
                    metadata=metadata
                )
            
            assert mock_blob.metadata == metadata
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_upload_empty_file(self, initialized_storage_manager):
        """测试上传空文件"""
        empty_file = Path("empty.txt")
        empty_file.touch()
        
        try:
            with open(empty_file, 'rb') as f:
                with pytest.raises(StorageUploadError) as exc_info:
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='text/plain'
                    )
            assert "Empty file" in str(exc_info.value)
        finally:
            empty_file.unlink()

    @pytest.mark.asyncio
    async def test_concurrent_uploads(self, initialized_storage_manager, mock_bucket):
        """测试并发上传文件"""
        test_files = [TestFileFactory.create_pdf() for _ in range(3)]
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        
        try:
            async def upload_file(file_path):
                with open(file_path, 'rb') as f:
                    return await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf'
                    )
            
            results = await asyncio.gather(
                *[upload_file(file) for file in test_files]
            )
            
            assert len(results) == 3
            assert all(isinstance(result, str) for result in results)
        finally:
            for file in test_files:
                file.unlink()

    @pytest.mark.asyncio
    async def test_get_signed_url_with_custom_expiration(self, initialized_storage_manager, mock_bucket):
        """测试自定义过期时间的签名URL"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        custom_expiration = timedelta(hours=24)
        
        await initialized_storage_manager.get_signed_url(
            "test.pdf",
            expiration=custom_expiration
        )
        
        mock_blob.generate_signed_url.assert_called_once()
        call_kwargs = mock_blob.generate_signed_url.call_args[1]
        assert call_kwargs['expiration'] == custom_expiration

    @pytest.mark.asyncio
    async def test_get_signed_url_invalid_expiration(self, initialized_storage_manager):
        """测试无效的过期时间参数"""
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.get_signed_url(
                "test.pdf",
                expiration=timedelta(days=-1)
            )
        assert "Invalid expiration" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_file_metadata(self, initialized_storage_manager, mock_bucket):
        """测试更新文件元数据"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        new_metadata = {"version": "2.0"}
        
        await initialized_storage_manager.update_metadata("test.pdf", new_metadata)
        
        assert mock_blob.metadata == new_metadata
        mock_blob.patch.assert_called_once()

    @pytest.mark.parametrize("content_type,expected_extension", [
        ("application/pdf", ".pdf"),
        ("application/msword", ".doc"),
        ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
    ])
    @pytest.mark.asyncio
    async def test_file_extension_mapping(self, initialized_storage_manager, content_type, expected_extension):
        """测试不同内容类型的文件扩展名映射"""
        test_file = TestFileFactory.create_file(content_type)
        
        try:
            with open(test_file, 'rb') as f:
                file_path = await initialized_storage_manager.upload_file(
                    file=f,
                    content_type=content_type
                )
            assert file_path.endswith(expected_extension)
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_storage_timeout_handling(self, initialized_storage_manager, mock_bucket):
        """测试存储操作超时处理"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.upload_from_file.side_effect = TimeoutError("Operation timed out")
        
        test_file = TestFileFactory.create_pdf()
        try:
            with open(test_file, 'rb') as f:
                with pytest.raises(StorageUploadError) as exc_info:
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf'
                    )
            assert "Operation timed out" in str(exc_info.value)
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_file_name_special_characters(self, initialized_storage_manager):
        """测试特殊字符文件名处理"""
        special_path = "test/file$#@!.pdf"  # 包含不允许的特殊字符
        test_file = TestFileFactory.create_pdf()
        
        try:
            with open(test_file, 'rb') as f:
                with pytest.raises(StorageUploadError) as exc_info:
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf',
                        file_path=special_path
                    )
            assert "Invalid file path" in str(exc_info.value)
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_very_long_file_name(self, initialized_storage_manager):
        """测试超长文件名处理"""
        long_path = "a" * 257 + ".pdf"  # 超过256字符限制
        test_file = TestFileFactory.create_pdf()
        
        try:
            with open(test_file, 'rb') as f:
                with pytest.raises(StorageUploadError) as exc_info:
                    await initialized_storage_manager.upload_file(
                        file=f,
                        content_type='application/pdf',
                        file_path=long_path
                    )
            assert "File name too long" in str(exc_info.value)
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_get_file_content_success(self, initialized_storage_manager, mock_bucket):
        """测试成功获取文件内容"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        
        # 模拟下载内容
        expected_content = b"test content"
        mock_blob.download_as_bytes.return_value = expected_content
        
        content = await initialized_storage_manager.get_file_content("test.pdf")
        
        assert content == expected_content
        mock_blob.download_as_bytes.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_file_content_not_found(self, initialized_storage_manager, mock_bucket):
        """测试获取不存在文件的内容"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = False
        
        with pytest.raises(StorageAccessError) as exc_info:
            await initialized_storage_manager.get_file_content("nonexistent.pdf")
        
        assert "File not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_file_content_error(self, initialized_storage_manager, mock_bucket):
        """测试获取文件内容失败"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        mock_blob.download_as_bytes.side_effect = Exception("Download failed")
        
        with pytest.raises(StorageAccessError) as exc_info:
            await initialized_storage_manager.get_file_content("test.pdf")
        
        assert "Download failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_signed_url_expiration_too_long(self, initialized_storage_manager):
        """测试签名URL过期时间过长"""
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.get_signed_url(
                "test.pdf",
                expiration=timedelta(days=8)  # 超过7天
            )
        
        assert "Invalid expiration: cannot exceed 7 days" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_file_exists_error(self, initialized_storage_manager, mock_bucket):
        """测试检查文件存在时发生错误"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.side_effect = Exception("Check existence failed")
        
        with pytest.raises(StorageAccessError) as exc_info:
            await initialized_storage_manager.file_exists("test.pdf")
        
        assert "Check existence failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_metadata_error(self, initialized_storage_manager, mock_bucket):
        """测试更新元数据失败"""
        mock_blob = Mock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        mock_blob.patch.side_effect = Exception("Update failed")
        
        with pytest.raises(StorageUploadError) as exc_info:
            await initialized_storage_manager.update_metadata(
                "test.pdf",
                {"version": "2.0"}
            )
        
        assert "Failed to update metadata" in str(exc_info.value)

@pytest.mark.unit
class TestConfig:
    """配置测试"""

    def test_parse_mime_types(self):
        """测试MIME类型解析"""
        # 测试有效的MIME类型字符串
        mime_types = "application/pdf,application/msword"
        settings = Settings(
            GCP_BUCKET_NAME="test-bucket",
            ALLOWED_MIME_TYPES=mime_types
        )
        
        # 传入 MIME 类型字符串作为参数
        parsed = settings.parse_mime_types(mime_types)
        assert "application/pdf" in parsed
        assert "application/msword" in parsed
        
        # 测试空字符串
        empty_mime_types = ""
        parsed_empty = settings.parse_mime_types(empty_mime_types)
        # 确保返回的集合不包含有效的 MIME 类型
        assert not any(mime_type for mime_type in parsed_empty if mime_type.strip())

    def test_get_settings(self):
        """测试获取设置实例"""
        settings = get_settings()
        assert isinstance(settings, Settings)
        assert hasattr(settings, 'GCP_BUCKET_NAME')
        assert hasattr(settings, 'ALLOWED_MIME_TYPES')