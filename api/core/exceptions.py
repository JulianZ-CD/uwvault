from fastapi import HTTPException, status

class AppError(Exception):
    """Base application exception class"""
    pass

# API exceptions
class APIError(HTTPException):
    """API exception base class"""
    def __init__(
        self,
        status_code: int,
        detail: str = None,
        headers: dict = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class NotFoundError(APIError):
    """Resource not found exception"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ValidationError(APIError):
    """Data validation exception"""
    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

# Storage related exceptions
class StorageError(Exception):
    """Base class for storage related errors"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class StorageConnectionError(StorageError):
    """Storage connection exception"""
    pass

class StorageAuthenticationError(StorageError):
    """Storage authentication exception"""
    pass

class StorageOperationError(StorageError):
    """Storage operation exception"""
    def __init__(self, operation: str, detail: str):
        self.operation = operation
        self.detail = detail
        super().__init__(f"{operation} failed: {detail}")

class ResourceError(Exception):
    """Base class for resource related errors"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class ResourceNotFoundError(ResourceError):
    """Resource not found error"""
    pass

class ResourceValidationError(ResourceError):
    """Resource validation error"""
    pass

class StorageUploadError(StorageError):
    """Storage upload error"""
    pass

class StorageDownloadError(StorageError):
    """Storage download error"""
    pass 