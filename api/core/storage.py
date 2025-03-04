from google.cloud import storage
from google.oauth2 import service_account
from datetime import timedelta
from typing import BinaryIO, Optional, Dict
import asyncio

from .config import settings
from .exceptions import StorageConnectionError, StorageError

class StorageManager:
    """GCP storage manager - only provides basic storage operations"""
    
    def __init__(self):
        self._client = None
        self._bucket = None
        
    async def _ensure_initialized(self) -> None:
        """Ensure storage connection is initialized"""
        if self._bucket is None:
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    settings.GCP_CREDENTIALS_PATH
                )
                self._client = storage.Client(
                    project=settings.GCP_PROJECT_ID,
                    credentials=credentials
                )
                self._bucket = self._client.bucket(settings.GCP_BUCKET_NAME)
                
                if not self._bucket.exists():
                    raise StorageConnectionError(
                        f"Bucket {settings.GCP_BUCKET_NAME} does not exist"
                    )
                    
            except Exception as e:
                raise StorageConnectionError(f"Storage initialization failed: {str(e)}")

    async def upload_file(
        self, 
        file: BinaryIO, 
        destination_path: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """Upload file to specified path"""
        await self._ensure_initialized()
        try:
            blob = self._bucket.blob(destination_path)
            
            if content_type:
                blob.content_type = content_type
            if metadata:
                blob.metadata = metadata
                
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: blob.upload_from_file(file, rewind=True)
            )
            
            return destination_path
            
        except Exception as e:
            raise StorageError(f"Upload failed: {str(e)}")

    async def get_signed_url(
        self,
        file_path: str,
        expiration: timedelta = timedelta(minutes=30)
    ) -> str:
        """Get signed URL for file"""
        await self._ensure_initialized()
        try:
            blob = self._bucket.blob(file_path)
            url = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: blob.generate_signed_url(
                    expiration=expiration,
                    method='GET'
                )
            )
            return url
        except Exception as e:
            raise StorageError(f"Failed to generate signed URL: {str(e)}")

    async def delete_file(self, file_path: str) -> bool:
        """Delete file at specified path"""
        await self._ensure_initialized()
        try:
            blob = self._bucket.blob(file_path)
            exists = await asyncio.get_event_loop().run_in_executor(
                None, blob.exists
            )
            if not exists:
                return False
                
            await asyncio.get_event_loop().run_in_executor(
                None, blob.delete
            )
            return True
            
        except Exception as e:
            raise StorageError(f"Delete failed: {str(e)}")

    async def verify_file_exists(self, file_path: str) -> bool:
        """Verify if file exists"""
        await self._ensure_initialized()
        try:
            blob = self._bucket.blob(file_path)
            exists = await asyncio.get_event_loop().run_in_executor(
                None, blob.exists
            )
            return exists
        except Exception as e:
            raise StorageError(f"Verification failed: {str(e)}")

storage_manager = StorageManager()