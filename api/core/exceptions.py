from fastapi import HTTPException, status

class AppError(Exception):
    """应用基础异常类"""
    pass

# API异常
class APIError(HTTPException):
    """API异常基类"""
    def __init__(
        self,
        status_code: int,
        detail: str = None,
        headers: dict = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class NotFoundError(APIError):
    """资源未找到异常"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ValidationError(APIError):
    """数据验证异常"""
    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

# 存储相关异常
class StorageError(Exception):
    """存储相关错误的基类"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class StorageConnectionError(StorageError):
    """存储连接异常"""
    pass

class StorageAuthenticationError(StorageError):
    """存储认证异常"""
    pass

class StorageOperationError(StorageError):
    """存储操作异常"""
    def __init__(self, operation: str, detail: str):
        self.operation = operation
        self.detail = detail
        super().__init__(f"{operation} failed: {detail}")

class ResourceError(Exception):
    """资源相关错误的基类"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class ResourceNotFoundError(ResourceError):
    """资源未找到错误"""
    pass

class ResourceValidationError(ResourceError):
    """资源验证错误"""
    pass

class StorageUploadError(StorageError):
    """存储上传错误"""
    pass

class StorageDownloadError(StorageError):
    """存储下载错误"""
    pass 