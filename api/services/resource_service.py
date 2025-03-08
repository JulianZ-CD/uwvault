from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple, BinaryIO
from fastapi import UploadFile
from api.models.resource import (
    ResourceCreate, ResourceUpdate, ResourceInDB, 
    ResourceStatus, ResourceReview, StorageStatus, StorageOperation
)
from api.core.exceptions import (
    NotFoundError, ValidationError, StorageError, StorageConnectionError, StorageOperationError
)
from api.utils.logger import setup_logger
from api.utils.file_handlers import FileHandler, ResourceType
from api.core.config import get_settings
from supabase import create_client, Client
from api.core.mock_auth import MockUser
import asyncio
from google.cloud import storage
from google.oauth2 import service_account


class ResourceService:
    def __init__(self, supabase_client: Optional[Client] = None, table_name: str = 'resources'):
        """
        Initialize resource service
        Args:
            supabase_client: Optional Supabase client instance
            table_name: Table name, defaults to 'resources'
        """
        settings = get_settings()
        self.supabase = supabase_client or create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_KEY
        )
        self.table_name = table_name
        self.logger = setup_logger("resource_service", "resource_service.log")
        self.MAX_ERROR_LENGTH = 500
        
        # Storage related attributes
        self._storage_client = None
        self._storage_bucket = None
        self.settings = settings

    # Storage related methods
    async def _ensure_storage_initialized(self) -> None:
        """Ensure storage connection is initialized"""
        if self._storage_bucket is None:
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    self.settings.GCP_CREDENTIALS_PATH
                )
                self._storage_client = storage.Client(
                    project=self.settings.GCP_PROJECT_ID,
                    credentials=credentials
                )
                self._storage_bucket = self._storage_client.bucket(self.settings.GCP_BUCKET_NAME)
                
                if not self._storage_bucket.exists():
                    raise StorageConnectionError(
                        f"Bucket {self.settings.GCP_BUCKET_NAME} does not exist"
                    )
                    
            except Exception as e:
                raise StorageConnectionError(f"Storage initialization failed: {str(e)}")

    async def get_resource_by_id(self, id: int, include_pending: bool = False) -> ResourceInDB:
        """Get a single resource
        
        Args:
            id: Resource ID
            include_pending: If True, return resource regardless of status
        """
        try:
            self.logger.info(f"Getting resource with ID {id}")
            query = self.supabase.table(self.table_name).select("*").eq('id', id)
                
            response = query.single().execute()

            if not response.data:
                raise NotFoundError(f"Resource with id {id} not found")

            resource = ResourceInDB(**response.data)
            self.logger.info(f"Successfully fetched resource with id: {id}")
            return resource
        except Exception as e:
            error_str = str(e)
            if "no rows" in error_str.lower() or "0 rows" in error_str.lower():
                self.logger.error(f"Resource with id {id} not found")
                raise NotFoundError(f"Resource with id {id} not found")
            
            self.logger.error(f"Error while fetching resource {id}: {str(e)}")
            raise

    async def create_resource(
        self,
        resource: ResourceCreate,
        file: UploadFile
    ) -> ResourceInDB:
        """Create new resource"""
        try:
            self.logger.info(f"Creating new resource: {resource.title}")
            
            # 1. File validation
            if not FileHandler.validate_file_type(file.content_type):
                raise ValidationError("Invalid file type")
            if not FileHandler.validate_file_size(file.size):
                raise ValidationError("File too large")

            # 2. Prepare metadata
            file_hash = FileHandler.calculate_file_hash(file.file)
            safe_filename = FileHandler.generate_safe_filename(file.filename)
            storage_path = FileHandler.generate_storage_path(
                safe_filename,
                ResourceType.COURSE_DOCUMENT,
                resource.course_id
            )

            # 3. Create database record
            resource_data = resource.model_dump()
            
            current_time = datetime.now().isoformat()
            resource_data.update({
                "created_at": current_time,
                "updated_at": current_time,
                "storage_path": storage_path,
                "file_hash": file_hash,
                "file_type": FileHandler.get_file_extension(file.filename),
                "file_size": file.size,
                "mime_type": file.content_type,
                "original_filename": file.filename,
                "created_by": resource.uploader_id,
                "updated_by": resource.uploader_id,
                "status": ResourceStatus.PENDING,
                "storage_status": StorageStatus.PENDING,
                "retry_count": 0
            })

            # 4. Save to database and upload file
            response = self.supabase.table(self.table_name).insert(resource_data).execute()
            created_resource = ResourceInDB(**response.data[0])

            # 4. Upload to GCP, using technical metadata
            try:
                # Prepare GCP storage technical metadata
                gcp_metadata = {
                    "resource_id": str(created_resource.id),
                    "original_filename": file.filename,
                    "content_hash": file_hash,
                    "file_type": FileHandler.get_file_extension(file.filename),
                    "file_size": str(file.size),
                    "mime_type": file.content_type,
                    "created_at": current_time,
                    "created_by": str(resource.uploader_id),
                    "course_id": resource.course_id
                }
                
                # 直接使用GCP存储方法，替换storage.upload_file
                await self._ensure_storage_initialized()
                try:
                    blob = self._storage_bucket.blob(storage_path)
                    
                    if file.content_type:
                        blob.content_type = file.content_type
                    if gcp_metadata:
                        blob.metadata = gcp_metadata
                        
                    await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: blob.upload_from_file(file.file, rewind=True)
                    )
                except Exception as e:
                    raise StorageError(f"Upload failed: {str(e)}")
                
                # 5. Update sync status
                await self._update_sync_status(
                    created_resource.id,
                    StorageStatus.SYNCED,
                    last_sync_at=datetime.now()
                )
                
            except StorageError as e:
                await self._handle_storage_error(
                    created_resource.id,
                    StorageOperation.UPLOAD,
                    e
                )
                raise StorageOperationError("upload", str(e))

            return created_resource

        except Exception as e:
            self.logger.error(f"Error while creating resource: {str(e)}")
            raise

    async def verify_resource_sync(self, resource_id: int) -> dict:
        """Verify resource synchronization status"""
        resource = await self.get_resource_by_id(resource_id, include_pending=True)
        
        try:
            # 直接使用GCP存储方法，替换storage.verify_file_exists
            await self._ensure_storage_initialized()
            try:
                blob = self._storage_bucket.blob(resource.storage_path)
                exists = await asyncio.get_event_loop().run_in_executor(
                    None, blob.exists
                )
                if exists:
                    return {
                        "is_synced": True,
                        "storage_status": StorageStatus.SYNCED,
                        "error_message": None
                    }
            except Exception as e:
                raise StorageError(f"Verification failed: {str(e)}")
        except Exception as e:
            return {
                "is_synced": False,
                "storage_status": StorageStatus.ERROR,
                "error_message": str(e)[:self.MAX_ERROR_LENGTH]
            }

    async def _update_sync_status(
        self,
        resource_id: int,
        status: StorageStatus,
        error_message: Optional[str] = None,
        last_sync_at: Optional[datetime] = None
    ) -> None:
        """Update resource synchronization status"""
        update_data = {
            "storage_status": status,
            "updated_at": datetime.now().isoformat()
        }
        
        if error_message:
            update_data["sync_error"] = error_message
        if last_sync_at:
            update_data["last_sync_at"] = last_sync_at.isoformat()
            
        self.supabase.table(self.table_name).update(update_data).eq(
            'id', resource_id
        ).execute()

    async def _handle_storage_error(
        self,
        resource_id: int,
        operation: StorageOperation,
        error: Exception
    ) -> None:
        """Handle storage operation error
        
        Args:
            resource_id: Resource ID
            operation: Storage operation type
            error: Exception that occurred
        """
        self.logger.error(f"{operation} failed: {str(error)}")
        
        try:
            resource = await self.get_resource_by_id(resource_id, include_pending=True)
            
            update_data = {
                "storage_status": StorageStatus.ERROR,
                "sync_error": str(error)[:self.MAX_ERROR_LENGTH],
                "updated_at": datetime.now().isoformat(),
                "retry_count": resource.retry_count + 1  # 增加重试计数
            }
            
            self.supabase.table(self.table_name).update(update_data).eq(
                'id', resource_id
            ).execute()
            
        except Exception as e:
            self.logger.error(f"Failed to handle storage error: {str(e)}")

    async def update_resource(
        self,
        id: int,
        resource: ResourceUpdate
    ) -> ResourceInDB:
        """Update resource information"""
        try:
            self.logger.info(f"Updating resource with id: {id}")
            
            # Check if resource exists
            existing_resource = await self.get_resource_by_id(id)
            
            # Prepare update data
            update_data = resource.model_dump(exclude_unset=True)
            update_data["updated_at"] = datetime.now().isoformat()
            update_data["updated_by"] = resource.updated_by

            # Update database
            response = self.supabase.table(self.table_name).update(
                update_data).eq('id', id).execute()

            if not response.data:
                raise NotFoundError(f"Resource with id {id} not found")

            updated_resource = ResourceInDB(**response.data[0])
            self.logger.info(f"Successfully updated resource with id: {id}")
            return updated_resource

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error while updating resource {id}: {str(e)}")
            raise

    async def delete_resource(self, id: int) -> bool:
        """Delete resource"""
        try:
            self.logger.info(f"Deleting resource with id: {id}")
            
            # Get resource information
            resource = await self.get_resource_by_id(id)
            
            # Delete file from storage
            try:
                # 直接使用GCP存储方法，替换storage.delete_file
                await self._ensure_storage_initialized()
                try:
                    blob = self._storage_bucket.blob(resource.storage_path)
                    exists = await asyncio.get_event_loop().run_in_executor(
                        None, blob.exists
                    )
                    if not exists:
                        self.logger.warning(f"File {resource.storage_path} does not exist in storage")
                    else:
                        await asyncio.get_event_loop().run_in_executor(
                            None, blob.delete
                        )
                except Exception as e:
                    raise StorageError(f"Delete failed: {str(e)}")
            except StorageError as e:
                self.logger.error(f"Storage error: {str(e)}")
                raise StorageOperationError("delete", str(e))

            # Delete record from database
            response = self.supabase.table(self.table_name).delete().eq('id', id).execute()
            
            if not response.data:
                raise NotFoundError(f"Resource with id {id} not found")

            self.logger.info(f"Successfully deleted resource with id: {id}")
            return True

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error while deleting resource {id}: {str(e)}")
            raise

    async def get_resource_url(
        self,
        id: int,
        expiration: Optional[timedelta] = None
    ) -> str:
        """Get resource download URL"""
        try:
            resource = await self.get_resource_by_id(id)
            
            # 直接使用GCP存储方法，替换storage.get_signed_url
            await self._ensure_storage_initialized()
            try:
                blob = self._storage_bucket.blob(resource.storage_path)
                url = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: blob.generate_signed_url(
                        expiration=expiration or timedelta(minutes=30),
                        method='GET'
                    )
                )
                return url
            except Exception as e:
                raise StorageError(f"Failed to generate signed URL: {str(e)}")
                
        except NotFoundError:
            raise
        except StorageError as e:
            self.logger.error(f"Storage error: {str(e)}")
            raise StorageOperationError("get_url", str(e))
        except Exception as e:
            self.logger.error(f"Error while getting resource URL: {str(e)}")
            raise

    async def review_resource(
        self,
        id: int,
        review: ResourceReview
    ) -> ResourceInDB:
        """Review a resource"""
        try:
            self.logger.info(f"Reviewing resource with id: {id}")
            
            # Check if resource exists
            existing_resource = await self.get_resource_by_id(id, include_pending=True)
            
            # Prepare update data
            update_data = {
                "status": review.status,
                "review_comment": review.review_comment,
                "reviewed_at": datetime.now().isoformat(),
                "reviewed_by": review.reviewed_by,
                "updated_at": datetime.now().isoformat(),
                "updated_by": review.reviewed_by
            }

            # If resource is rejected or deactivated, also update is_active status
            if review.status in [ResourceStatus.REJECTED, ResourceStatus.INACTIVE]:
                update_data["is_active"] = False
            elif review.status == ResourceStatus.APPROVED:
                update_data["is_active"] = True

            # Update database
            response = self.supabase.table(self.table_name).update(
                update_data).eq('id', id).execute()

            if not response.data:
                raise NotFoundError(f"Resource with id {id} not found")

            updated_resource = ResourceInDB(**response.data[0])
            self.logger.info(
                f"Successfully reviewed resource with id: {id}, "
                f"status: {review.status}"
            )
            return updated_resource

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.error(f"Error while reviewing resource {id}: {str(e)}")
            raise

    async def deactivate_resource(self, id: int, admin_id: int) -> ResourceInDB:
        """Deactivate a resource"""
        review = ResourceReview(
            status=ResourceStatus.INACTIVE,
            review_comment="Resource deactivated by admin",
            reviewed_by=admin_id
        )
        return await self.review_resource(id, review)

    async def reactivate_resource(self, id: int, admin_id: int) -> ResourceInDB:
        """Reactivate a resource"""
        review = ResourceReview(
            status=ResourceStatus.APPROVED,
            review_comment="Resource reactivated by admin",
            reviewed_by=admin_id
        )
        return await self.review_resource(id, review)

    async def list_resources(
        self,
        limit: int = 10,
        offset: int = 0,
        include_pending: bool = False
    ) -> Tuple[List[ResourceInDB], int]:
        """Get resource list
        
        Args:
            limit: Maximum number of resources to return
            offset: Number of resources to skip
            include_pending: Whether to include pending resources
        """
        try:
            self.logger.info(f"Getting resource list: limit={limit}, offset={offset}")
            
            count_query = self.supabase.table(self.table_name).select("*", count='exact')
            count_response = count_query.execute()
            total_count = count_response.count

            query = self.supabase.table(self.table_name).select("*")
            query = query.order('created_at', desc=True).limit(limit).offset(offset)
            response = query.execute()
            
            resources = [ResourceInDB(**item) for item in response.data]
            self.logger.info(f"Successfully retrieved {len(resources)} resources")
            
            return resources, total_count
        except Exception as e:
            self.logger.error(f"Error while getting resource list: {str(e)}")
            raise 