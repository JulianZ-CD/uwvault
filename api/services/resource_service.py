from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple, BinaryIO, Union
from fastapi import UploadFile
from api.models.resource import (
    ResourceCreate, ResourceUpdate, ResourceInDB, 
    ResourceStatus, ResourceReview, StorageStatus, StorageOperation,
    ResourceRating, ResourceRatingCreate, ResourceType
)
from api.utils.logger import setup_logger
from api.core.config import get_settings
from supabase import create_client, Client
import asyncio
from google.cloud import storage
from google.oauth2 import service_account
import os
import hashlib
from enum import Enum
from uuid import uuid4

FILE_SIZE_LIMIT: int = 52428800

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

class ResourceService:
    def __init__(self, supabase_client: Optional[Client] = None, table_name: str = 'resources', ratings_table: str = 'resource_ratings'):
        """Initialize resource service"""
        settings = get_settings()
        self.supabase = supabase_client or create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_KEY
        )
        self.table_name = table_name
        self.ratings_table = ratings_table
        self.logger = setup_logger("resource_service", "resource_service.log")
        self.MAX_ERROR_LENGTH = 500
        
        # Storage related attributes
        self._storage_client = None
        self._storage_bucket = None
        self.settings = settings

    def validate_file_type(self, content_type: str) -> bool:
        return content_type in ALLOWED_MIME_TYPES

    def validate_file_size(self, size: int) -> bool:
        return size <= FILE_SIZE_LIMIT

    def generate_safe_filename(self, original_filename: str) -> str:
        ext = os.path.splitext(original_filename)[1].lower()
        return f"{uuid4().hex}{ext}"
    
    def get_file_extension(self, filename: str) -> str:
        return os.path.splitext(filename)[1].lower()

    def generate_storage_path(
        self,
        filename: str,
        resource_type: ResourceType,
        course_id: Optional[int] = None
    ) -> str:
        date = datetime.now()
        
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

    def calculate_file_hash(self, file: Union[bytes, BinaryIO]) -> str:
        sha256_hash = hashlib.sha256()
        if isinstance(file, bytes):
            sha256_hash.update(file)
        else:
            current_position = file.tell()
            file.seek(0)
            
            for byte_block in iter(lambda: file.read(4096), b""):
                sha256_hash.update(byte_block)
                
            file.seek(current_position)
            
        return sha256_hash.hexdigest()

    # === Public API Methods ===
    async def create_resource(self, resource: ResourceCreate, file: UploadFile) -> ResourceInDB:
        """Create new resource"""
        try:
            self.logger.info(f"Creating new resource: {resource.title}")
            await self._validate_file(file)
            
            if not isinstance(resource.uploader_id, str):
                raise ValueError("uploader_id must be a string")
            
            # create database record
            file_metadata = await self._prepare_file_metadata(file, resource.course_id)
            resource_data = resource.model_dump()
            current_time = datetime.now().isoformat()
            
            resource_data.update({
                "created_at": current_time,
                "updated_at": current_time,
                "created_by": resource.uploader_id,
                "updated_by": resource.uploader_id,
                "status": resource.status,
                "storage_status": StorageStatus.PENDING,
                "retry_count": 0,
                **file_metadata
            })
            
            response = self.supabase.table(self.table_name).insert(resource_data).execute()
            
            if not response.data:
                raise ValueError("Failed to create resource record")
                
            created_resource = ResourceInDB(**response.data[0])
            self.logger.info(f"Created resource record with id: {created_resource.id}")
            
            # upload file to GCP
            gcp_metadata = await self._prepare_gcp_metadata(
                created_resource.id, 
                file, 
                file_metadata["file_hash"], 
                resource.uploader_id, 
                resource.course_id
            )
            
            await self._upload_file_to_storage(
                file, 
                created_resource.storage_path, 
                created_resource.id, 
                gcp_metadata
            )
            
            return created_resource
            
        except ValueError as e:
            self.logger.error(f"Validation error: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error creating resource: {str(e)}")
            raise

    async def update_resource(
        self,
        id: int,
        resource: ResourceUpdate,
        file: Optional[UploadFile] = None
    ) -> ResourceInDB:
        """Update resource information"""
        try:
            self.logger.info(f"Updating resource with id: {id}")
            existing_resource = await self.get_resource_by_id(id)
            
            if resource.title is not None and len(resource.title.strip()) == 0:
                raise ValueError("Title cannot be empty")
            
            if file and file.filename:
                self.logger.info(f"File provided for update - filename: {file.filename}, content_type: {file.content_type}")
                await self._validate_file(file)

            # prepare update data
            update_data = resource.model_dump(exclude_unset=True)
            update_data["updated_at"] = datetime.now().isoformat()
            update_data["updated_by"] = resource.updated_by
            
            # if new file is provided, process it
            if file:
                course_id = resource.course_id or existing_resource.course_id
                file_metadata = await self._prepare_file_metadata(file, course_id)
                
                update_data.update({
                    **file_metadata,
                    "storage_status": StorageStatus.PENDING
                })
            
            # update database
            response = self.supabase.table(self.table_name).update(
                update_data).eq('id', id).execute()
            
            if not response.data:
                raise ValueError(f"Resource with id {id} not found")
            
            updated_resource = ResourceInDB(**response.data[0])
            
            # if new file is provided, upload to GCPstorage
            if file:
                course_id = resource.course_id or existing_resource.course_id
                gcp_metadata = await self._prepare_gcp_metadata(
                    updated_resource.id, 
                    file, 
                    update_data["file_hash"], 
                    resource.updated_by, 
                    course_id,
                    is_update=True
                )
                
                await self._upload_file_to_storage(
                    file, 
                    updated_resource.storage_path, 
                    updated_resource.id, 
                    gcp_metadata
                )
                
                # if storage path changed, delete old file
                if existing_resource.storage_path != updated_resource.storage_path:
                    try:
                        old_blob = self._storage_bucket.blob(existing_resource.storage_path)
                        exists = await asyncio.get_event_loop().run_in_executor(
                            None, old_blob.exists
                        )
                        if exists:
                            await asyncio.get_event_loop().run_in_executor(
                                None, old_blob.delete
                            )
                    except Exception as e:
                        self.logger.warning(f"Failed to delete old file: {str(e)}")
            
            self.logger.info(f"Successfully updated resource with id: {id}")
            return updated_resource
            
        except ValueError as e:
            self.logger.error(f"Validation error: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error while updating resource {id}: {str(e)}")
            raise

    async def get_resource_url(
        self,
        id: int,
        expiration: Optional[timedelta] = None
    ) -> str:
        """Get resource download URL"""
        try:
            self.logger.info(f"Getting download URL for resource {id}")
            resource = await self.get_resource_by_id(id)
            
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
                raise ValueError(f"Failed to generate signed URL: {str(e)}")
                
        except ValueError as e:
            self.logger.error(f"Error getting resource URL: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error while getting resource URL: {str(e)}")
            raise

    async def get_all_course_ids(self) -> List[str]:
        """Get all unique course IDs"""
        try:
            self.logger.info("Getting all unique course IDs")
            
            response = self.supabase.rpc('get_all_course_ids').execute()
            
            if not response.data:
                return []
            
            course_ids = [item['course_id'] for item in response.data if item['course_id']]
            
            self.logger.info(f"Successfully retrieved {len(course_ids)} unique course IDs")
            
            return course_ids
        except Exception as e:
            self.logger.error(f"Error getting course IDs: {str(e)}")
            return []

    async def list_resources(
        self,
        limit: int = 10,
        offset: int = 0,
        include_pending: bool = False,
        course_id: Optional[str] = None
    ) -> Tuple[List[ResourceInDB], int]:
        """Get resource list"""
        try:
            self.logger.info(f"Getting resource list: limit={limit}, offset={offset}, include_pending={include_pending}, course_id={course_id}")
        
            if course_id:
                if include_pending:
                    response = self.supabase.rpc('get_all_resources_by_course', {
                        'course_id_val': course_id,
                        'limit_val': limit, 
                        'offset_val': offset
                    }).execute()
                    count_response = self.supabase.rpc('count_all_resources_by_course', {
                        'course_id_val': course_id
                    }).execute()
                else:
                    response = self.supabase.rpc('get_approved_resources_by_course', {
                        'course_id_val': course_id,
                        'limit_val': limit, 
                        'offset_val': offset
                    }).execute()
                    count_response = self.supabase.rpc('count_approved_resources_by_course', {
                        'course_id_val': course_id
                    }).execute()
            else:
                if include_pending:
                    response = self.supabase.rpc('get_all_resources', {
                        'limit_val': limit, 
                        'offset_val': offset
                    }).execute()
                    count_response = self.supabase.rpc('count_all_resources').execute()
                else:
                    response = self.supabase.rpc('get_approved_resources', {
                        'limit_val': limit, 
                        'offset_val': offset
                    }).execute()
                    count_response = self.supabase.rpc('count_approved_resources').execute()
            
            if not response.data:
                return [], 0
            
            resources = [ResourceInDB(**item) for item in response.data]
            total_count = count_response.data[0]['count'] if count_response.data else 0
            
            self.logger.info(f"Successfully retrieved {len(resources)} resources from {total_count} total")
            
            return resources, total_count
        except Exception as e:
            self.logger.error(f"Error while getting resource list: {str(e)}")
            return [], 0

    async def get_user_uploads(self, user_id: str, limit: int = 10, offset: int = 0):
        """Get resources uploaded by a specific user"""
        try:
            self.logger.info(f"Getting uploads for user {user_id}: limit={limit}, offset={offset}")

            response = self.supabase.rpc('get_user_uploads', {
                'user_id': user_id,
                'limit_val': limit, 
                'offset_val': offset
            }).execute()
            
            count_response = self.supabase.rpc('count_user_uploads', {
                'user_id': user_id
            }).execute()
            
            if not response.data:
                return [], 0
            
            resources = [ResourceInDB(**item) for item in response.data]
            total_count = count_response.data[0]['count'] if count_response.data else 0
            
            self.logger.info(f"Successfully retrieved {len(resources)} resources from {total_count} total")
            
            return resources, total_count
        except Exception as e:
            self.logger.error(f"Error getting user uploads: {str(e)}")
            return [], 0

    async def rate_resource(self, resource_id: int, user_id: str, rating_data: ResourceRatingCreate) -> Dict:
        """Rate or update resource rating"""
        try:
            self.logger.info(f"Rating resource {resource_id} by user {user_id} with rating {rating_data.rating}")
            
            resource = await self.get_resource_by_id(resource_id)
            if resource.status != ResourceStatus.APPROVED:
                raise ValueError("only approved resources can be rated")
                
            existing_rating = await self._get_user_rating(resource_id, user_id)
            current_time = datetime.now().isoformat()
            
            if existing_rating:
                rating_update = {
                    "rating": rating_data.rating,
                    "updated_at": current_time
                }
                
                response = self.supabase.table(self.ratings_table).update(
                    rating_update
                ).eq("resource_id", resource_id).eq("user_id", user_id).execute()
                
                if not response.data:
                    raise ValueError("Failed to update rating")
                    
                self.logger.info(f"Updated rating for resource {resource_id} by user {user_id}")
            else:
                new_rating = {
                    "resource_id": resource_id,
                    "user_id": user_id,
                    "rating": rating_data.rating,
                    "created_at": current_time,
                    "updated_at": current_time
                }
                
                response = self.supabase.table(self.ratings_table).insert(new_rating).execute()
                
                if not response.data:
                    raise ValueError("Failed to create rating")
                    
                self.logger.info(f"Created new rating for resource {resource_id} by user {user_id}")
            
            await self._update_resource_rating_stats(resource_id)
            updated_stats = await self._get_resource_rating_stats(resource_id)
            
            return {
                "resource_id": resource_id,
                "user_rating": rating_data.rating,
                "average_rating": updated_stats.get("average_rating", 0),
                "rating_count": updated_stats.get("rating_count", 0)
            }
            
        except ValueError as e:
            self.logger.error(f"Resource not found: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error rating resource {resource_id}: {str(e)}")
            raise
    
    async def get_user_rating(self, resource_id: int, user_id: str) -> Dict:
        """Get user rating for a resource"""
        try:
            rating = await self._get_user_rating(resource_id, user_id)
            stats = await self._get_resource_rating_stats(resource_id)
            
            return {
                "resource_id": resource_id,
                "user_rating": rating.get("rating", 0) if rating else 0,
                "average_rating": stats.get("average_rating", 0),
                "rating_count": stats.get("rating_count", 0)
            }
        except Exception as e:
            self.logger.error(f"Error getting user rating for resource {resource_id}: {str(e)}")
            return {
                "resource_id": resource_id,
                "user_rating": 0,
                "average_rating": 0,
                "rating_count": 0
            }

    async def review_resource(
        self,
        id: int,
        review: ResourceReview
    ) -> ResourceInDB:
        """Review a resource"""
        try:
            self.logger.info(f"Reviewing resource with id: {id}")
            existing_resource = await self.get_resource_by_id(id, include_pending=True)
            
            update_data = {
                "status": review.status,
                "review_comment": review.review_comment,
                "reviewed_at": datetime.now().isoformat(),
                "reviewed_by": review.reviewed_by,
                "updated_at": datetime.now().isoformat(),
                "updated_by": review.reviewed_by
            }

            if review.status in [ResourceStatus.REJECTED, ResourceStatus.INACTIVE]:
                update_data["is_active"] = False
            elif review.status == ResourceStatus.APPROVED:
                update_data["is_active"] = True

            response = self.supabase.table(self.table_name).update(
                update_data).eq('id', id).execute()

            if not response.data:
                raise ValueError(f"Resource with id {id} not found")

            updated_resource = ResourceInDB(**response.data[0])
            self.logger.info(
                f"Successfully reviewed resource with id: {id}, "
                f"status: {review.status}"
            )
            return updated_resource

        except ValueError as e:
            self.logger.error(f"Resource not found: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error while reviewing resource {id}: {str(e)}")
            raise

    async def deactivate_resource(self, id: int, admin_id: str) -> ResourceInDB:
        """Deactivate a resource"""
        try:
            review = ResourceReview(
                status=ResourceStatus.INACTIVE,
                review_comment="Resource deactivated by admin",
                reviewed_by=admin_id
            )
            return await self.review_resource(id, review)
        except Exception as e:
            self.logger.error(f"Error deactivating resource {id}: {str(e)}")
            raise

    async def reactivate_resource(self, id: int, admin_id: str) -> ResourceInDB:
        """Reactivate a resource"""
        try:
            review = ResourceReview(
                status=ResourceStatus.APPROVED,
                review_comment="Resource reactivated by admin",
                reviewed_by=admin_id
            )
            return await self.review_resource(id, review)
        except Exception as e:
            self.logger.error(f"Error reactivating resource {id}: {str(e)}")
            raise

    async def get_resource_by_id(self, id: int, include_pending: bool = False) -> ResourceInDB:
        """Get a single resource database info"""
        try:
            self.logger.info(f"Getting resource with ID {id}")

            results = await self._filter_query(self.table_name, {"id": id})
            if not results:
                raise ValueError(f"Resource with id {id} not found")
                
            resource = ResourceInDB(**results[0])

            return resource
        except Exception as e:
            error_str = str(e)
            if "no rows" in error_str.lower() or "0 rows" in error_str.lower():
                self.logger.error(f"Resource with id {id} not found")
                raise ValueError(f"Resource with id {id} not found")
            
            self.logger.error(f"Error while fetching resource {id}: {str(e)}")
            raise
    
    async def delete_resource(self, id: int) -> bool:
        """Delete resource"""
        try:
            self.logger.info(f"Deleting resource with id: {id}")
            resource = await self.get_resource_by_id(id)

            try:
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
                    raise ValueError(f"Delete failed: {str(e)}")
            except ValueError as e:
                self.logger.error(f"Storage error: {str(e)}")
                raise ValueError(str(e))

            response = self.supabase.table(self.table_name).delete().eq('id', id).execute()
            if not response.data:
                raise ValueError(f"Resource with id {id} not found")

            self.logger.info(f"Successfully deleted resource with id: {id}")
            return True

        except ValueError as e:
            self.logger.error(f"Resource not found: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error while deleting resource {id}: {str(e)}")
            raise

    # === Private Helper Methods ===
    async def _ensure_storage_initialized(self) -> None:
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
                    raise ValueError(
                        f"Bucket {self.settings.GCP_BUCKET_NAME} does not exist"
                    )
                    
            except Exception as e:
                raise ValueError(f"Storage initialization failed: {str(e)}")

    async def _validate_file(self, file: UploadFile) -> None:
        if not self.validate_file_type(file.content_type):
            raise ValueError(f"Unsupported file type: {file.content_type}")
        
        if not self.validate_file_size(file.size):
            raise ValueError(f"File too large: {file.size} bytes (max {FILE_SIZE_LIMIT} bytes)")

    async def _prepare_file_metadata(self, file: UploadFile, course_id: str) -> dict:
        file_hash = self.calculate_file_hash(file.file)
        await file.seek(0)
        
        safe_filename = self.generate_safe_filename(file.filename)
        storage_path = self.generate_storage_path(
            safe_filename,
            ResourceType.COURSE_DOCUMENT,
            course_id
        )
        
        return {
            "file_hash": file_hash,
            "file_size": file.size,
            "file_type": self.get_file_extension(file.filename),
            "mime_type": file.content_type,
            "original_filename": file.filename,
            "storage_path": storage_path
        }

    async def _prepare_gcp_metadata(
        self, 
        resource_id: int, 
        file: UploadFile, 
        file_hash: str, 
        user_id: str, 
        course_id: str,
        is_update: bool = False
    ) -> dict:
        current_time = datetime.now().isoformat()
        
        metadata = {
            "resource_id": str(resource_id),
            "original_filename": file.filename,
            "content_hash": file_hash,
            "file_type": self.get_file_extension(file.filename),
            "file_size": str(file.size),
            "mime_type": file.content_type,
            "course_id": course_id or ""
        }
        
        if is_update:
            metadata.update({
                "updated_at": current_time,
                "updated_by": str(user_id)
            })
        else:
            metadata.update({
                "created_at": current_time,
                "created_by": str(user_id)
            })
        
        return metadata

    async def _verify_resource_sync(self, resource_id: int) -> dict:
        resource = await self.get_resource_by_id(resource_id, include_pending=True)
        
        try:
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
                raise ValueError(f"Verification failed: {str(e)}")
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
        self.logger.error(f"{operation} failed: {str(error)}")
        
        try:
            resource = await self.get_resource_by_id(resource_id, include_pending=True)
            
            update_data = {
                "storage_status": StorageStatus.ERROR,
                "sync_error": str(error)[:self.MAX_ERROR_LENGTH],
                "updated_at": datetime.now().isoformat(),
                "retry_count": resource.retry_count + 1
            }
            
            self.supabase.table(self.table_name).update(update_data).eq(
                'id', resource_id
            ).execute()
            
        except Exception as e:
            self.logger.error(f"Failed to handle storage error: {str(e)}")

    async def _upload_file_to_storage(
        self, 
        file: UploadFile, 
        storage_path: str, 
        resource_id: int, 
        metadata: dict
    ) -> None:
        await self._ensure_storage_initialized()
        
        try:
            blob = self._storage_bucket.blob(storage_path)
            
            if file.content_type:
                blob.content_type = file.content_type
            
            blob.metadata = metadata
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: blob.upload_from_file(file.file, rewind=True)
            )
            
            await self._update_sync_status(
                resource_id,
                StorageStatus.SYNCED,
                last_sync_at=datetime.now()
            )
        except Exception as e:
            await self._handle_storage_error(
                resource_id,
                StorageOperation.UPLOAD,
                e
            )
            raise ValueError(f"Failed to upload file: {str(e)}")

    async def _filter_query(self, table_name, conditions, limit=None, offset=None, order_by=None, order_desc=True):
        try:
            query = self.supabase.table(table_name).select("*")
            response = query.execute()
            
            if not response.data:
                return []
                
            filtered_data = response.data
            for field, value in conditions.items():
                filtered_data = [item for item in filtered_data if item[field] == value]
                
            if order_by:
                reverse = order_desc
                filtered_data = sorted(filtered_data, key=lambda x: x.get(order_by, ''), reverse=reverse)
                
            if limit is not None:
                start = offset if offset is not None else 0
                filtered_data = filtered_data[start:start + limit]
                
            return filtered_data
        except Exception as e:
            self.logger.error(f"Error in filter query: {str(e)}")
            return []

    async def _get_user_rating(self, resource_id: int, user_id: str) -> Optional[Dict]:
        try:
            response = self.supabase.table(self.ratings_table).select(
                "*"
            ).eq("resource_id", resource_id).eq("user_id", user_id).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            self.logger.error(f"Error getting user rating: {str(e)}")
            return None
    
    async def _get_resource_rating_stats(self, resource_id: int) -> Dict:
        try:
            response = self.supabase.table(self.table_name).select(
                "average_rating, rating_count"
            ).eq("id", resource_id).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return {"average_rating": 0, "rating_count": 0}
        except Exception as e:
            self.logger.error(f"Error getting resource rating stats: {str(e)}")
            return {"average_rating": 0, "rating_count": 0}
    
    async def _update_resource_rating_stats(self, resource_id: int) -> None:
        try:
            response = self.supabase.table(self.ratings_table).select(
                "rating"
            ).eq("resource_id", resource_id).execute()
            
            if not response.data:
                update_data = {
                    "average_rating": 0,
                    "rating_count": 0,
                    "updated_at": datetime.now().isoformat()
                }
            else:
                ratings = [item.get("rating", 0) for item in response.data]
                average = sum(ratings) / len(ratings) if ratings else 0
                
                update_data = {
                    "average_rating": round(average, 1),
                    "rating_count": len(ratings),
                    "updated_at": datetime.now().isoformat()
                }
            
            self.supabase.table(self.table_name).update(
                update_data
            ).eq("id", resource_id).execute()
            
            self.logger.info(f"Updated rating stats for resource {resource_id}")
        except Exception as e:
            self.logger.error(f"Error updating resource rating stats: {str(e)}")
            raise 