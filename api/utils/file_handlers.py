import os
import hashlib
from enum import Enum
from datetime import datetime
from typing import Optional, BinaryIO, Union
from uuid import uuid4

# 文件大小限制
FILE_SIZE_LIMIT: int = 52428800  # 50MB

# 允许的文件类型
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

class ResourceType(Enum):
    """资源类型枚举"""
    DOCUMENT = "document"
    COURSE_DOCUMENT = "course-documents"
    RESOURCE_FILE = "resource-files"


class FileHandler:
    """文件处理工具类"""
    
    @staticmethod
    def validate_file_type(content_type: str) -> bool:
        """验证文件MIME类型"""
        return content_type in ALLOWED_MIME_TYPES

    @staticmethod
    def validate_file_size(size: int) -> bool:
        """验证文件大小"""
        return size <= FILE_SIZE_LIMIT

    @staticmethod
    def generate_safe_filename(original_filename: str) -> str:
        """生成安全的文件名"""
        ext = os.path.splitext(original_filename)[1].lower()
        return f"{uuid4().hex}{ext}"

    @staticmethod
    def generate_storage_path(
        filename: str,
        resource_type: ResourceType,
        course_id: Optional[int] = None
    ) -> str:
        """生成存储路径
        
        Args:
            filename: 原始文件名（应该是安全的文件名）
            resource_type: 资源类型
            course_id: 课程ID（课程文档必需）
            
        Returns:
            str: 存储路径
        """
        date = datetime.now()
        
        # 处理测试用例中的 DOCUMENT 类型
        if resource_type == ResourceType.DOCUMENT:
            return f"document/{date.year}/{date.month:02d}/{filename}"
            
        base_path = resource_type.value
        parts = [base_path]
        
        if resource_type == ResourceType.COURSE_DOCUMENT:
            if not course_id:
                raise ValueError("course_id is required for course documents")
            parts.append(str(course_id))
        
        parts.extend([
            str(date.year),
            f"{date.month:02d}",
            filename
        ])
        
        return '/'.join(parts)

    @staticmethod
    def get_file_extension(filename: str) -> str:
        """获取文件扩展名"""
        return os.path.splitext(filename)[1].lower()

    @staticmethod
    def calculate_file_hash(file: Union[bytes, BinaryIO]) -> str:
        """计算文件的 SHA-256 哈希值"""
        sha256_hash = hashlib.sha256()
        if isinstance(file, bytes):
            sha256_hash.update(file)
        else:
            for byte_block in iter(lambda: file.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest() 