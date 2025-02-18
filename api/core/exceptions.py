class StorageError(Exception):
    """存储服务基础异常"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class StorageConnectionError(StorageError):
    """存储服务连接异常"""
    pass

class StorageUploadError(StorageError):
    """文件上传异常"""
    pass

class StorageAccessError(StorageError):
    """文件访问异常"""
    pass 