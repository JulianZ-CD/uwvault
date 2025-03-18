from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple, BinaryIO, Union
from fastapi import UploadFile
from api.models.resource import (
    ResourceCreate, ResourceUpdate, ResourceInDB, 
    ResourceStatus, ResourceReview, StorageStatus, StorageOperation,
    ResourceRating, ResourceRatingCreate
)
from api.core.exceptions import (
    NotFoundError, ValidationError, StorageError, StorageConnectionError, StorageOperationError
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

class ResourceService:
    def __init__(self, supabase_client: Optional[Client] = None, table_name: str = 'resources', ratings_table: str = 'resource_ratings'):
        """
        Initialize resource service
        Args:
            supabase_client: Optional Supabase client instance
            table_name: Table name, defaults to 'resources'
            ratings_table: Ratings table name, defaults to 'resource_ratings'
        """
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

    # 从 FileHandler 移植的文件处理方法
    def validate_file_type(self, content_type: str) -> bool:
        """验证文件MIME类型"""
        return content_type in ALLOWED_MIME_TYPES

    def validate_file_size(self, size: int) -> bool:
        """验证文件大小"""
        return size <= FILE_SIZE_LIMIT

    def generate_safe_filename(self, original_filename: str) -> str:
        """生成安全的文件名"""
        ext = os.path.splitext(original_filename)[1].lower()
        return f"{uuid4().hex}{ext}"

    def generate_storage_path(
        self,
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

    def get_file_extension(self, filename: str) -> str:
        """获取文件扩展名"""
        return os.path.splitext(filename)[1].lower()

    def calculate_file_hash(self, file: Union[bytes, BinaryIO]) -> str:
        """计算文件的 SHA-256 哈希值"""
        sha256_hash = hashlib.sha256()
        if isinstance(file, bytes):
            sha256_hash.update(file)
        else:
            # 保存当前位置
            current_position = file.tell()
            # 重置到文件开头
            file.seek(0)
            
            for byte_block in iter(lambda: file.read(4096), b""):
                sha256_hash.update(byte_block)
                
            # 恢复到原来的位置
            file.seek(current_position)
            
        return sha256_hash.hexdigest()

    async def _filter_query(self, table_name, conditions, limit=None, offset=None, order_by=None, order_desc=True):
        """通用查询方法，使用基础select和Python过滤"""
        try:
            query = self.supabase.table(table_name).select("*")
            response = query.execute()
            
            if not response.data:
                return []
                
            # 在Python中进行过滤
            filtered_data = response.data
            for field, value in conditions.items():
                filtered_data = [item for item in filtered_data if item[field] == value]
                
            # 排序
            if order_by:
                reverse = order_desc
                filtered_data = sorted(filtered_data, key=lambda x: x.get(order_by, ''), reverse=reverse)
                
            # 分页
            if limit is not None:
                start = offset if offset is not None else 0
                filtered_data = filtered_data[start:start + limit]
                
            return filtered_data
        except Exception as e:
            self.logger.error(f"Error in filter query: {str(e)}")
            return []

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
            # query = self.supabase.table(self.table_name).select("*").eq('id', id)
                
            # response = query.single().execute()

            # if not response.data:
            #     raise NotFoundError(f"Resource with id {id} not found")

            # resource = ResourceInDB(**response.data)

            results = await self._filter_query(self.table_name, {"id": id})
            if not results:
                raise NotFoundError(f"Resource with id {id} not found")
                
            resource = ResourceInDB(**results[0])

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
            
            # 验证文件类型
            if not self.validate_file_type(file.content_type):
                raise ValidationError("Invalid file type")
            
            # 验证文件大小
            if not self.validate_file_size(file.size):
                raise ValidationError("File too large")

            # 确保 uploader_id 是有效的UUID字符串
            if not isinstance(resource.uploader_id, str):
                raise ValidationError("uploader_id must be a string")

            # 2. Prepare metadata
            file_hash = self.calculate_file_hash(file.file)
            safe_filename = self.generate_safe_filename(file.filename)
            storage_path = self.generate_storage_path(
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
                "file_type": self.get_file_extension(file.filename),
                "file_size": file.size,
                "mime_type": file.content_type,
                "original_filename": file.filename,
                "created_by": resource.uploader_id,
                "updated_by": resource.uploader_id,
                "status": resource.status,
                "storage_status": StorageStatus.PENDING,
                "retry_count": 0
            })

            # 4. Save to database and upload file
            response = self.supabase.table(self.table_name).insert(resource_data).execute()
            
            if not response.data:
                raise Exception("Failed to create resource record")
                
            created_resource = ResourceInDB(**response.data[0])
            self.logger.info(f"Created resource record with id: {created_resource.id}")
            
            # 4. Upload file to storage
            try:
                # Prepare GCP storage technical metadata
                gcp_metadata = {
                    "resource_id": str(created_resource.id),
                    "original_filename": file.filename,
                    "content_hash": file_hash,
                    "file_type": self.get_file_extension(file.filename),
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

        except ValidationError as e:
            self.logger.error(f"Validation error: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error creating resource: {str(e)}")
            raise

    async def get_user_uploads(self, user_id: str, limit: int = 10, offset: int = 0):
        """Get resources uploaded by a specific user"""
        try:
            self.logger.info(f"Getting uploads for user {user_id}: limit={limit}, offset={offset}")
            
            # 使用SQL函数
            response = self.supabase.rpc('get_user_uploads', {
                'user_id': user_id,
                'limit_val': limit, 
                'offset_val': offset
            }).execute()
            
            count_response = self.supabase.rpc('count_user_uploads', {
                'user_id': user_id
            }).execute()
            
            # 处理结果
            if not response.data:
                return [], 0
            
            resources = [ResourceInDB(**item) for item in response.data]
            total_count = count_response.data[0]['count'] if count_response.data else 0
            
            self.logger.info(f"Successfully retrieved {len(resources)} resources from {total_count} total")
            
            return resources, total_count
        except Exception as e:
            import traceback
            stack_trace = traceback.format_exc()
            self.logger.error(f"Error getting user uploads: {str(e)}")
            self.logger.error(f"Stack trace: {stack_trace}")
            # 返回空列表而不是抛出异常
            return [], 0

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
        """Get resource download URL
        
        Args:
            id: Resource ID
            expiration: URL expiration time, defaults to 30 minutes
            
        Returns:
            str: Signed URL for resource download
        """
        try:
            self.logger.info(f"Getting download URL for resource {id}")
            
            # Get resource information
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
            self.logger.info(f"Getting resource list: limit={limit}, offset={offset}, include_pending={include_pending}")
            
            # 使用SQL函数
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
            
            # 处理结果
            if not response.data:
                return [], 0
            
            resources = [ResourceInDB(**item) for item in response.data]
            total_count = count_response.data[0]['count'] if count_response.data else 0
            
            self.logger.info(f"Successfully retrieved {len(resources)} resources from {total_count} total")
            
            return resources, total_count
        except Exception as e:
            import traceback
            stack_trace = traceback.format_exc()
            self.logger.error(f"Error while getting resource list: {str(e)}")
            self.logger.error(f"Stack trace: {stack_trace}")
            # 返回空列表而不是抛出异常
            return [], 0

    async def rate_resource(self, resource_id: int, user_id: str, rating_data: ResourceRatingCreate) -> Dict:
        """对资源进行评分或更新评分
        
        Args:
            resource_id: 资源ID
            user_id: 用户ID
            rating_data: 评分数据
            
        Returns:
            包含评分信息的字典
        """
        try:
            self.logger.info(f"Rating resource {resource_id} by user {user_id} with rating {rating_data.rating}")
            
            # 1. 验证资源存在且状态为 APPROVED
            resource = await self.get_resource_by_id(resource_id)
            if resource.status != ResourceStatus.APPROVED:
                raise ValidationError("only approved resources can be rated")
                
            # 2. 检查用户是否已评分
            existing_rating = await self._get_user_rating(resource_id, user_id)
            current_time = datetime.now().isoformat()
            
            if existing_rating:
                # 更新现有评分
                rating_update = {
                    "rating": rating_data.rating,
                    "updated_at": current_time
                }
                
                response = self.supabase.table(self.ratings_table).update(
                    rating_update
                ).eq("resource_id", resource_id).eq("user_id", user_id).execute()
                
                if not response.data:
                    raise Exception("Failed to update rating")
                    
                self.logger.info(f"Updated rating for resource {resource_id} by user {user_id}")
            else:
                # 创建新评分
                new_rating = {
                    "resource_id": resource_id,
                    "user_id": user_id,
                    "rating": rating_data.rating,
                    "created_at": current_time,
                    "updated_at": current_time
                }
                
                response = self.supabase.table(self.ratings_table).insert(new_rating).execute()
                
                if not response.data:
                    raise Exception("Failed to create rating")
                    
                self.logger.info(f"Created new rating for resource {resource_id} by user {user_id}")
            
            # 3. 更新资源的评分统计
            await self._update_resource_rating_stats(resource_id)
            
            # 4. 获取更新后的评分统计
            updated_stats = await self._get_resource_rating_stats(resource_id)
            
            return {
                "resource_id": resource_id,
                "user_rating": rating_data.rating,
                "average_rating": updated_stats.get("average_rating", 0),
                "rating_count": updated_stats.get("rating_count", 0)
            }
            
        except NotFoundError:
            raise
        except ValidationError:
            raise
        except Exception as e:
            self.logger.error(f"Error rating resource {resource_id}: {str(e)}")
            raise
    
    async def get_user_rating(self, resource_id: int, user_id: str) -> Dict:
        """获取用户对资源的评分
        
        Args:
            resource_id: 资源ID
            user_id: 用户ID
            
        Returns:
            包含用户评分信息的字典
        """
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
    
    # 私有辅助方法
    async def _get_user_rating(self, resource_id: int, user_id: str) -> Optional[Dict]:
        """获取用户对资源的评分记录"""
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
        """获取资源的评分统计"""
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
        """更新资源的评分统计"""
        try:
            # 获取所有评分
            response = self.supabase.table(self.ratings_table).select(
                "rating"
            ).eq("resource_id", resource_id).execute()
            
            if not response.data:
                # 没有评分，设置为默认值
                update_data = {
                    "average_rating": 0,
                    "rating_count": 0,
                    "updated_at": datetime.now().isoformat()
                }
            else:
                # 计算平均分和评分数
                ratings = [item.get("rating", 0) for item in response.data]
                average = sum(ratings) / len(ratings) if ratings else 0
                
                update_data = {
                    "average_rating": round(average, 1),  # 保留一位小数
                    "rating_count": len(ratings),
                    "updated_at": datetime.now().isoformat()
                }
            
            # 更新资源记录
            self.supabase.table(self.table_name).update(
                update_data
            ).eq("id", resource_id).execute()
            
            self.logger.info(f"Updated rating stats for resource {resource_id}")
        except Exception as e:
            self.logger.error(f"Error updating resource rating stats: {str(e)}")
            raise 