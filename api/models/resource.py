from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class ResourceStatus(str, Enum):
    """Resource status enumeration"""
    UPLOADING = "uploading"  
    PENDING = "pending"    
    APPROVED = "approved" 
    REJECTED = "rejected"  
    INACTIVE = "inactive" 


class StorageStatus(str, Enum):
    """Storage sync status enumeration"""
    SYNCED = "synced"
    PENDING = "pending"
    ERROR = "error"
    DELETING = "deleting"


class StorageOperation(str, Enum):
    """Storage operation types"""
    UPLOAD = "upload"
    DELETE = "delete"
    SYNC = "sync"
    VERIFY = "verify"


class ResourceBase(BaseModel):
    """Base resource model - fields provided by users"""
    title: str = Field(..., min_length=1, max_length=100, description="Resource title")
    description: Optional[str] = Field(None, max_length=500, description="Resource description")
    course_id: Optional[str] = Field(None, max_length=50, description="Associated course ID")
    original_filename: Optional[str] = Field(None, max_length=255, description="Original file name")
    status: ResourceStatus = Field(
        default=ResourceStatus.PENDING,
        description="Resource review status"
    )
    review_comment: Optional[str] = Field(None, max_length=500, description="Review comment")
    reviewed_at: Optional[datetime] = Field(None, description="Review timestamp")
    reviewed_by: Optional[int] = Field(None, description="Reviewer user ID")


class ResourceCreate(ResourceBase):
    """create resource request model"""
    original_filename: str = Field(..., max_length=255, description="Original file name")
    uploader_id: int = Field(..., description="ID of the user uploading the resource")
    
    # add optional technical fields, allowing service layer to fill
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    file_hash: Optional[str] = None


class ResourceUpdate(BaseModel):
    """update resource request model"""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    course_id: Optional[str] = Field(None, max_length=50, description="Associated course ID") 
    updated_by: int = Field(..., description="ID of the user updating the resource")


class ResourceReview(BaseModel):
    """Resource review request model"""
    status: ResourceStatus = Field(
        ...,
        description="Review status of the resource"
    )
    review_comment: Optional[str] = Field(
        None,
        max_length=500,
        description="Review comment"
    )
    reviewed_by: int = Field(
        ...,
        gt=0,
        description="ID of the reviewing user"
    )


class ResourceSyncOperation(BaseModel):
    """Resource sync operation model"""
    resource_id: int
    operation: StorageOperation
    status: StorageStatus
    error_message: Optional[str] = Field(None, max_length=500)
    retry_count: int = Field(default=0)


class ResourceInDB(ResourceBase):
    """database resource model"""
    id: int = Field(..., description="Resource ID")
    created_at: datetime = Field(default_factory=datetime.now, description="Created timestamp")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last updated timestamp")
    created_by: int = Field(..., description="Creator user ID")
    updated_by: int = Field(..., description="Last updater user ID")
    is_active: bool = Field(default=True, description="Resource status")
    storage_status: StorageStatus = Field(
        default=StorageStatus.PENDING,
        description="Storage sync status"
    )
    last_sync_at: Optional[datetime] = Field(
        None,
        description="Last successful sync timestamp"
    )
    sync_error: Optional[str] = Field(
        None,
        max_length=500,
        description="Last sync error message"
    )
    retry_count: int = Field(
        default=0,
        description="Number of sync retry attempts"
    )
    file_type: Optional[str] = Field(None, description="File extension")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    storage_path: Optional[str] = Field(None, description="Storage path in cloud storage")
    mime_type: Optional[str] = Field(None, description="MIME type of the file")
    file_hash: Optional[str] = Field(None, description="File content hash")

    model_config = ConfigDict(
        from_attributes=True,
        table_name="resources",
        schema_name="public"
    )

    @property
    def is_synced(self) -> bool:
        """Check if resource is synced with storage"""
        return self.storage_status == StorageStatus.SYNCED

    def get_sync_status(self) -> dict:
        """get resource sync status information"""
        return {
            "is_synced": self.is_synced,
            "storage_status": self.storage_status,
            "error_message": self.sync_error,
            "last_sync_at": self.last_sync_at,
            "retry_count": self.retry_count
        } 