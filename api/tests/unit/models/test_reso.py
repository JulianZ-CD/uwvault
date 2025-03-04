import pytest
from datetime import datetime
from api.models.resource import (
    ResourceBase, ResourceCreate, ResourceUpdate, ResourceInDB,
    ResourceStatus, StorageStatus, StorageOperation, ResourceReview,
    ResourceSyncOperation
)

@pytest.mark.unit
class TestResourceCreate:
    def test_resource_create_success(self):
        """Test successful ResourceCreate model creation"""
        resource_data = {
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "ece 651",
            "original_filename": "test.pdf",
            "uploader_id": 1,
            "file_type": "pdf",
            "file_size": 1024,
            "storage_path": "test/path/file.pdf",
            "mime_type": "application/pdf",
            "file_hash": "abc123"
        }
        resource = ResourceCreate(**resource_data)
        assert resource.title == resource_data["title"]
        assert resource.file_type == resource_data["file_type"]
        assert resource.storage_path == resource_data["storage_path"]
        assert resource.status == ResourceStatus.PENDING

    def test_resource_create_minimal(self):
        """Test ResourceCreate with minimal required fields"""
        resource_data = {
            "title": "Test Resource",
            "original_filename": "test.pdf",
            "uploader_id": 1
        }
        resource = ResourceCreate(**resource_data)
        assert resource.title == resource_data["title"]
        assert resource.description is None
        assert resource.course_id is None
        assert resource.file_type is None

    @pytest.mark.parametrize("invalid_data", [
        {"title": "", "original_filename": "test.pdf"}, 
        {"title": "T" * 101, "original_filename": "test.pdf"}, 
        {"title": "Test", "description": "D" * 501}, 
        {"title": "Test", "course_id": 0},
    ])
    def test_resource_create_validation_errors(self, invalid_data):
        """Test ResourceCreate validation constraints"""
        base_data = {
            "original_filename": "test.pdf",
            "uploader_id": 1
        }
        with pytest.raises(ValueError):
            ResourceCreate(**{**base_data, **invalid_data})

@pytest.mark.unit
class TestResourceUpdate:
    def test_resource_update_success(self):
        """Test successful ResourceUpdate model creation"""
        update_data = {
            "title": "Updated Resource",
            "description": "Updated Description",
            "course_id": "ece 657",
            "updated_by": 1
        }
        resource_update = ResourceUpdate(**update_data)
        assert resource_update.title == update_data["title"]
        assert resource_update.description == update_data["description"]
        assert resource_update.course_id == update_data["course_id"]

    @pytest.mark.parametrize("invalid_data", [
        {"title": "", "updated_by": 1},  # Empty title
        {"title": "T" * 101, "updated_by": 1},  # Title too long
        {"description": "D" * 501, "updated_by": 1},  # Description too long
        {"course_id": 0, "updated_by": 1},  # Invalid course_id
    ])
    def test_resource_update_validation_errors(self, invalid_data):
        """Test ResourceUpdate validation constraints"""
        with pytest.raises(ValueError):
            ResourceUpdate(**invalid_data)

@pytest.mark.unit
class TestResourceReview:
    def test_resource_review_success(self):
        """Test successful ResourceReview model creation"""
        review_data = {
            "status": ResourceStatus.APPROVED,
            "review_comment": "Approved for testing",
            "reviewed_by": 1
        }
        review = ResourceReview(**review_data)
        assert review.status == ResourceStatus.APPROVED
        assert review.review_comment == review_data["review_comment"]

    @pytest.mark.parametrize("invalid_data", [
        {"status": "invalid_status", "reviewed_by": 1},  
        {"status": ResourceStatus.APPROVED, "review_comment": "C" * 501}, 
        {"status": ResourceStatus.APPROVED, "reviewed_by": 0}, 
    ])
    def test_resource_review_validation_errors(self, invalid_data):
        """Test ResourceReview validation constraints"""
        with pytest.raises(ValueError):
            ResourceReview(**invalid_data)

@pytest.mark.unit
class TestResourceInDB:
    def test_resource_in_db_success(self):
        """Test successful ResourceInDB model creation"""
        resource_data = {
            "id": 1,
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "ece 651",
            "file_type": "pdf",
            "file_size": 1024,
            "storage_path": "test/path/file.pdf",
            "mime_type": "application/pdf",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "created_by": 1,
            "updated_by": 1,
            "file_hash": "abc123",
            "is_active": True,
            "storage_status": StorageStatus.SYNCED,
            "original_filename": "test.pdf"
        }
        resource = ResourceInDB(**resource_data)
        assert resource.id == resource_data["id"]
        assert resource.title == resource_data["title"]
        assert resource.storage_status == StorageStatus.SYNCED
        assert resource.is_synced is True

    def test_resource_sync_status(self):
        """Test resource sync status methods"""
        resource = ResourceInDB(
            id=1,
            title="Test Resource",
            original_filename="test.pdf",
            file_type="pdf",
            file_size=1024,
            storage_path="test/path/file.pdf",
            mime_type="application/pdf",
            created_by=1,
            updated_by=1,
            file_hash="abc123",
            storage_status=StorageStatus.SYNCED,
            last_sync_at=datetime.now(),
            retry_count=0
        )
        
        sync_status = resource.get_sync_status()
        assert sync_status["is_synced"] is True
        assert sync_status["storage_status"] == StorageStatus.SYNCED
        assert sync_status["retry_count"] == 0
        assert sync_status["error_message"] is None

    def test_resource_sync_error(self):
        """Test resource sync error handling"""
        error_message = "Failed to sync with storage"
        resource = ResourceInDB(
            id=1,
            title="Test Resource",
            original_filename="test.pdf",
            file_type="pdf",
            file_size=1024,
            storage_path="test/path/file.pdf",
            mime_type="application/pdf",
            created_by=1,
            updated_by=1,
            file_hash="abc123",
            storage_status=StorageStatus.ERROR,
            sync_error=error_message,
            retry_count=1
        )
        
        sync_status = resource.get_sync_status()
        assert sync_status["is_synced"] is False
        assert sync_status["storage_status"] == StorageStatus.ERROR
        assert sync_status["error_message"] == error_message
        assert sync_status["retry_count"] == 1

@pytest.mark.unit
class TestResourceSyncOperation:
    def test_sync_operation_success(self):
        """Test successful ResourceSyncOperation model creation"""
        operation_data = {
            "resource_id": 1,
            "operation": StorageOperation.UPLOAD,
            "status": StorageStatus.PENDING,
            "retry_count": 0
        }
        operation = ResourceSyncOperation(**operation_data)
        assert operation.resource_id == operation_data["resource_id"]
        assert operation.operation == StorageOperation.UPLOAD
        assert operation.status == StorageStatus.PENDING

    def test_sync_operation_with_error(self):
        """Test ResourceSyncOperation with error"""
        operation_data = {
            "resource_id": 1,
            "operation": StorageOperation.SYNC,
            "status": StorageStatus.ERROR,
            "error_message": "Sync failed",
            "retry_count": 2
        }
        operation = ResourceSyncOperation(**operation_data)
        assert operation.status == StorageStatus.ERROR
        assert operation.error_message == "Sync failed"
        assert operation.retry_count == 2 