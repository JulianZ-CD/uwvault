from google.cloud import storage
from google.auth import exceptions
from google.oauth2 import service_account
from datetime import timedelta
from typing import BinaryIO, Optional, Dict, Any
import asyncio
import uuid
import os
import logging

from api.core.config import settings as default_settings
from .exceptions import StorageConnectionError, StorageUploadError, StorageAccessError, StorageError
from ..utils.logger import get_logger

class StorageManager:
    """GCP存储管理器
    
    负责处理与Google Cloud Storage的所有交互，包括：
    - 文件上传和下载
    - 签名URL生成
    - 文件元数据管理
    - 存储健康检查
    """
    
    def __init__(self, settings=None):
        """初始化存储管理器"""
        self._settings = settings or default_settings
        self._client = None
        self._bucket = None
        self.logger = logging.getLogger(__name__)
        
    async def _ensure_initialized(self) -> None:
        """确保存储管理器已初始化"""
        if self._bucket is None:
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    self._settings.GCP_CREDENTIALS_PATH
                )
                self._client = storage.Client(
                    project=self._settings.GCP_PROJECT_ID,
                    credentials=credentials
                )
                
                # 检查存储桶是否存在
                bucket = self._client.bucket(self._settings.GCP_BUCKET_NAME)
                exists = bucket.exists()
                if not exists:
                    raise StorageConnectionError(f"Bucket {self._settings.GCP_BUCKET_NAME} does not exist")
                    
                self._bucket = bucket
                
            except Exception as e:
                self.logger.error(f"Failed to initialize storage: {str(e)}")
                raise StorageConnectionError(f"Failed to initialize storage: {str(e)}")

    async def upload_file(self, file, content_type: str = None, metadata: Dict[str, str] = None) -> str:
        """上传文件

        Args:
            file: 文件对象
            content_type: 文件类型
            metadata: 自定义元数据

        Returns:
            str: 文件路径
        """
        try:
            await self._ensure_initialized()
            
            # 生成唯一文件名
            file_name = f"{uuid.uuid4()}{os.path.splitext(getattr(file, 'name', ''))[1]}"
            blob = self._bucket.blob(file_name)
            
            # 设置内容类型
            if content_type:
                blob.content_type = content_type
            
            # 设置自定义元数据
            if metadata:
                blob.metadata = metadata
            
            # 检查文件大小限制
            file.seek(0, os.SEEK_END)
            size = file.tell()
            file.seek(0)
            
            # 检查MIME类型限制
            if content_type not in self._settings.ALLOWED_MIME_TYPES:
                raise StorageUploadError(f"Content type {content_type} is not allowed")
            
            # 获取允许的最大文件大小
            max_size = self._settings.FILE_SIZE_LIMITS.get(content_type, self._settings.DEFAULT_MAX_FILE_SIZE)
            if size > max_size:
                raise StorageUploadError(f"File size {size} exceeds limit of {max_size}")
            
            # 上传文件
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: blob.upload_from_file(
                    file,
                    content_type=content_type,
                    rewind=True  # 确保文件指针重置
                )
            )
            
            # 确保元数据已更新
            await asyncio.get_event_loop().run_in_executor(
                None, blob.reload
            )
            
            return file_name
            
        except Exception as e:
            self.logger.error(f"Upload failed: {str(e)}")
            raise StorageUploadError(f"Upload failed: {str(e)}")

    async def get_file_content(self, file_path: str) -> bytes:
        """获取文件内容
        
        Args:
            file_path: 文件存储路径
            
        Returns:
            bytes: 文件内容
            
        Raises:
            StorageAccessError: 访问失败时抛出
        """
        try:
            await self._ensure_initialized()
            
            if not await self.file_exists(file_path):
                raise StorageAccessError(f"File not found: {file_path}")
                
            blob = self._bucket.blob(file_path)
            return await asyncio.get_event_loop().run_in_executor(
                None,
                blob.download_as_bytes
            )
        except Exception as e:
            self.logger.error(f"Failed to get file content: {str(e)}")
            raise StorageAccessError(str(e))

    async def get_signed_url(
        self,
        file_path: str,
        expiration: Optional[timedelta] = None
    ) -> str:
        """获取文件的签名URL
        
        Args:
            file_path: 文件路径
            expiration: 可选的URL过期时间
            
        Returns:
            str: 签名URL
            
        Raises:
            StorageUploadError: 获取签名URL失败时抛出
        """
        try:
            await self._ensure_initialized()
            
            # 验证过期时间
            if expiration is not None:
                if expiration.total_seconds() <= 0:
                    raise StorageUploadError("Invalid expiration: must be positive")
                if expiration.total_seconds() > 604800:  # 7 days in seconds
                    raise StorageUploadError("Invalid expiration: cannot exceed 7 days")

            blob = self._bucket.blob(file_path)
            if not await asyncio.get_event_loop().run_in_executor(None, blob.exists):
                raise StorageUploadError(f"File not found: {file_path}")

            url = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: blob.generate_signed_url(
                    expiration=expiration or timedelta(minutes=30),
                    method='GET'
                )
            )
            return url
            
        except Exception as e:
            self.logger.error(f"Failed to get signed URL: {str(e)}")
            raise StorageUploadError(f"Failed to get signed URL: {str(e)}")

    async def delete_file(self, file_path: str) -> bool:
        """删除文件
        
        Args:
            file_path: 文件存储路径
            
        Returns:
            bool: 删除是否成功
            
        Raises:
            StorageUploadError: 删除失败时抛出
        """
        try:
            await self._ensure_initialized()
            
            if not await self.file_exists(file_path):
                raise StorageUploadError(f"File not found: {file_path}")
                
            blob = self._bucket.blob(file_path)
            await asyncio.get_event_loop().run_in_executor(None, blob.delete)
            
            self.logger.info(f"File deleted successfully: {file_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete file: {str(e)}")
            raise StorageUploadError(str(e))

    async def file_exists(self, file_path: str) -> bool:
        """检查文件是否存在
        
        Args:
            file_path: 文件存储路径
            
        Returns:
            bool: 文件是否存在
            
        Raises:
            StorageAccessError: 检查失败时抛出
        """
        try:
            await self._ensure_initialized()
            blob = self._bucket.blob(file_path)
            return await asyncio.get_event_loop().run_in_executor(None, blob.exists)
        except Exception as e:
            self.logger.error(f"Failed to check file existence: {str(e)}")
            raise StorageAccessError(str(e))

    async def get_metadata(self, file_path: str) -> Dict[str, str]:
        """获取文件元数据"""
        try:
            await self._ensure_initialized()
            blob = self._bucket.blob(file_path)
            
            # 确保blob已加载
            await asyncio.get_event_loop().run_in_executor(
                None, blob.reload
            )
            
            # 合并content_type和自定义元数据
            metadata = {}
            if blob.content_type:
                metadata['contentType'] = blob.content_type
            if blob.metadata:
                metadata.update(blob.metadata)
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Failed to get metadata: {str(e)}")
            raise StorageError(f"Failed to get metadata: {str(e)}")

    async def check_health(self) -> bool:
        """检查存储服务健康状态"""
        try:
            # 如果 _bucket 为 None，直接返回 False
            if self._bucket is None:
                return False
            
            # 尝试验证存储桶的可访问性
            exists = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._bucket.exists()
            )
            return exists
            
        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")
            return False

    def _get_file_extension(self, content_type: str) -> str:
        """根据内容类型获取文件扩展名"""
        mime_to_extension = {
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
        }
        return mime_to_extension.get(content_type, '')

    async def update_metadata(self, file_path: str, metadata: Dict[str, str]) -> None:
        """更新文件元数据"""
        try:
            await self._ensure_initialized()
            
            if not await self.file_exists(file_path):
                raise StorageUploadError(f"File not found: {file_path}")
            
            blob = self._bucket.blob(file_path)
            blob.metadata = metadata
            await asyncio.get_event_loop().run_in_executor(None, blob.patch)
            
        except Exception as e:
            self.logger.error(f"Failed to update metadata: {str(e)}")
            raise StorageUploadError(f"Failed to update metadata: {str(e)}")

# 创建全局单例实例
storage_manager = StorageManager() 