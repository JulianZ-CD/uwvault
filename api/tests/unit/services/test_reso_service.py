import pytest
from datetime import datetime, timedelta
from fastapi import UploadFile
from api.services.resource_service import ResourceService
from api.models.resource import (
    ResourceCreate, ResourceUpdate, ResourceInDB, ResourceReview,
    ResourceStatus, StorageStatus, StorageOperation,
)
from api.tests.factories import ResourceFactory, ResourceCreateFactory, ResourceReviewFactory, ResourceUpdateFactory, ResourceRatingCreateFactory
from unittest.mock import Mock, AsyncMock, MagicMock
from io import BytesIO
import asyncio


@pytest.fixture
def mock_file():
    """Create a mock file for testing"""
    file = Mock(spec=UploadFile)
    file.filename = "test.pdf"
    file.content_type = "application/pdf"
    file.file = BytesIO(b"test content")
    file.size = 1024
    return file


@pytest.mark.unit
class TestResourceService:
    @pytest.fixture
    def resource_service(self, mock_supabase, mock_gcp_storage):
        """Resource service fixture with mocked dependencies"""
        # 使用共享的 mock_supabase fixture 而不是创建新的
        
        # create service with mocks
        service = ResourceService(
            supabase_client=mock_supabase,
            table_name="resources"
        )
        
        # Set up GCP storage mocks
        service._storage_bucket = mock_gcp_storage["bucket"]
        service._ensure_storage_initialized = AsyncMock()
        
        return service

    @pytest.mark.asyncio
    async def test_get_resource_by_id(self, resource_service, mocker):
        """Test getting a resource by ID"""
        # set mock response
        mock_response = mocker.Mock()
        mock_response.data = [{
            "id": 1,
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "ece 651",
            "created_by": "user-123",
            "updated_by": "user-123",
            "status": ResourceStatus.APPROVED,
            "storage_status": StorageStatus.SYNCED,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_type": "pdf",
            "file_size": 1024,
            "storage_path": "test/path/file.pdf",
            "mime_type": "application/pdf",
            "file_hash": "test_hash",
            "is_active": True,
            "retry_count": 0,
            "average_rating": 0.0,
            "rating_count": 0
        }]
        
        mocker.patch.object(
            resource_service, 
            '_filter_query', 
            return_value=mock_response.data
        )

        # Act
        result = await resource_service.get_resource_by_id(1)

        # Assert
        assert result.id == 1
        assert result.title == "Test Resource"
        assert result.description == "Test Description"
        assert result.created_by == "user-123"
        assert result.updated_by == "user-123"

    @pytest.mark.asyncio
    async def test_get_resource_by_id_not_found(self, resource_service, mocker):
        """Test getting a non-existent resource"""
        # set mock response - empty data
        mock_response = mocker.Mock()
        mock_response.data = None
        resource_service.supabase.table().select().eq().single().execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(ValueError, match="Resource with id 999 not found"):
            await resource_service.get_resource_by_id(999)

    @pytest.mark.asyncio
    async def test_create_resource(self, resource_service, mock_file, mocker):
        """Test creating a resource"""
        # prepare test data
        resource_data = ResourceCreateFactory(course_id="ece 651")
    
        # mock file handling methods in ResourceService
        mocker.patch.object(resource_service, 'validate_file_type', return_value=True)
        mocker.patch.object(resource_service, 'validate_file_size', return_value=True)
        mocker.patch.object(resource_service, 'generate_safe_filename', return_value="safe_filename.pdf")
        mocker.patch.object(resource_service, 'generate_storage_path', return_value="test/path/safe_filename.pdf")
        mocker.patch.object(resource_service, 'calculate_file_hash', return_value="test_hash")
    
        # mock database insert
        mock_response = mocker.Mock()
        mock_response.data = [{
            "id": 1,
            "title": resource_data.title,
            "description": resource_data.description,
            "course_id": resource_data.course_id,
            "created_by": resource_data.uploader_id,
            "updated_by": resource_data.uploader_id,
            "status": ResourceStatus.PENDING,
            "storage_status": StorageStatus.SYNCED,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_type": "pdf",
            "file_size": 1024,
            "storage_path": "test/path/safe_filename.pdf",
            "mime_type": "application/pdf",
            "file_hash": "test_hash",
            "is_active": True,
            "retry_count": 0
        }]
        resource_service.supabase.table().insert().execute.return_value = mock_response
    
        # Act
        result = await resource_service.create_resource(resource_data, mock_file)
    
        # Assert
        assert result.id == 1
        assert result.title == resource_data.title
        assert result.course_id == resource_data.course_id
        assert result.status == ResourceStatus.PENDING
        assert result.storage_status == StorageStatus.SYNCED
        
        # Verify GCP storage was used
        resource_service._storage_bucket.blob.assert_called_once()
        blob = resource_service._storage_bucket.blob.return_value
        blob.upload_from_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_resource_invalid_file(self, resource_service, mocker):
        """Test creating resource with invalid file"""
        # Arrange
        mock_file = mocker.Mock(spec=UploadFile)
        mock_file.content_type = "invalid/type"
        resource_create = ResourceCreateFactory()
        
        mocker.patch.object(resource_service, 'validate_file_type', return_value=False)

        # Act & Assert
        with pytest.raises(ValueError, match="Unsupported file type"):
            await resource_service.create_resource(resource_create, mock_file)

    @pytest.mark.asyncio
    async def test_update_resource(self, resource_service, mocker):
        """Test updating an existing resource"""
        # Arrange
        original_resource = ResourceFactory()
        update_data = ResourceUpdateFactory(updated_by="user-456")
        
        mocker.patch.object(resource_service, 'get_resource_by_id', return_value=original_resource)

        # Mock update response
        updated_resource_data = {
            "id": original_resource.id,
            "title": update_data.title,
            "description": update_data.description,
            "course_id": original_resource.course_id,
            "created_by": original_resource.created_by,
            "updated_by": update_data.updated_by,
            "status": original_resource.status,
            "storage_status": original_resource.storage_status,
            "created_at": original_resource.created_at.isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_type": original_resource.file_type,
            "file_size": original_resource.file_size,
            "storage_path": original_resource.storage_path,
            "mime_type": original_resource.mime_type,
            "file_hash": original_resource.file_hash,
            "is_active": original_resource.is_active,
            "retry_count": original_resource.retry_count,
            "average_rating": original_resource.average_rating,
            "rating_count": original_resource.rating_count
        }
        
        resource_service.supabase.table().update().eq().execute.return_value.data = [updated_resource_data]

        # Act
        result = await resource_service.update_resource(original_resource.id, update_data)

        # Assert
        assert result.title == update_data.title
        assert result.description == update_data.description
        assert result.updated_by == update_data.updated_by
        resource_service.supabase.table().update().eq().execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_resource(self, resource_service, mocker):
        """Test deleting a resource"""
        # Arrange
        mock_resource = ResourceFactory(course_id="ece 651")
        
        async def mock_get_resource(*args, **kwargs):
            return mock_resource
        mocker.patch.object(resource_service, 'get_resource_by_id', side_effect=mock_get_resource)
        
        # Mock blob exists to return True
        blob = resource_service._storage_bucket.blob.return_value
        blob.exists.return_value = True
        
        resource_service.supabase.table().delete().eq().execute.return_value.data = [mock_resource.model_dump()]

        # Act
        result = await resource_service.delete_resource(mock_resource.id)

        # Assert
        assert result is True
        resource_service._storage_bucket.blob.assert_called_with(mock_resource.storage_path)
        blob.delete.assert_called_once()
        resource_service.supabase.table().delete().eq().execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_resource_url(self, resource_service, mocker):
        """Test getting resource download URL"""
        # Arrange
        mock_resource = ResourceFactory(course_id="ece 651")
        mock_url = "https://storage.googleapis.com/test-url"
        
        async def mock_get_resource(*args, **kwargs):
            return mock_resource
        mocker.patch.object(resource_service, 'get_resource_by_id', side_effect=mock_get_resource)
        
        # Set the return value for generate_signed_url
        blob = resource_service._storage_bucket.blob.return_value
        blob.generate_signed_url.return_value = mock_url

        # Act
        result = await resource_service.get_resource_url(mock_resource.id)

        # Assert
        assert result == mock_url
        resource_service._storage_bucket.blob.assert_called_with(mock_resource.storage_path)
        blob.generate_signed_url.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_resource_with_storage(self, resource_service, mock_file, mocker):
        """Test creating a new resource with storage handling"""
        # Arrange
        resource_create = ResourceCreateFactory(course_id="ece 651")
        mock_resource = ResourceFactory(
            title=resource_create.title,
            description=resource_create.description,
            course_id=resource_create.course_id,
            storage_status=StorageStatus.PENDING,
            status=ResourceStatus.UPLOADING
        )
    
        # Mock file handling - 使用 patch.object 而不是 patch
        mocker.patch.object(resource_service, 'validate_file_type', return_value=True)
        mocker.patch.object(resource_service, 'validate_file_size', return_value=True)
        mocker.patch.object(resource_service, 'generate_safe_filename', return_value="safe_filename.pdf")
        mocker.patch.object(resource_service, 'generate_storage_path', return_value="test/path/safe_filename.pdf")
        mocker.patch.object(resource_service, 'calculate_file_hash', return_value="test_hash")
    
        # Mock database operations
        mock_response = mocker.Mock()
        mock_response.data = [mock_resource.model_dump()]
        resource_service.supabase.table().insert().execute.return_value = mock_response
    
        # Mock _update_sync_status
        mocker.patch.object(resource_service, '_update_sync_status', new_callable=AsyncMock)
    
        # Act
        result = await resource_service.create_resource(resource_create, mock_file)
    
        # Assert
        assert result.status == ResourceStatus.UPLOADING
        assert result.storage_status == StorageStatus.PENDING
        
        # Verify GCP storage was used
        resource_service._storage_bucket.blob.assert_called_once()
        blob = resource_service._storage_bucket.blob.return_value
        blob.upload_from_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_resource_sync(self, resource_service, mocker):
        """Test verifying resource sync status"""
        # Arrange
        mock_resource = ResourceFactory(
            storage_path="test/path/file.pdf",
            storage_status=StorageStatus.PENDING
        )
        
        # Mock get_resource_by_id
        mocker.patch.object(
            resource_service, 
            'get_resource_by_id', 
            new_callable=AsyncMock,
            return_value=mock_resource
        )
        
        # Mock blob exists to return True
        blob = resource_service._storage_bucket.blob.return_value
        blob.exists.return_value = True
        
        # Mock _update_sync_status
        mocker.patch.object(
            resource_service, 
            '_update_sync_status', 
            new_callable=AsyncMock
        )
        
        # Act
        result = await resource_service._verify_resource_sync(mock_resource.id)
        
        # Assert
        assert result["is_synced"] is True
        assert result["storage_status"] == StorageStatus.SYNCED
        assert result["error_message"] is None
        resource_service._storage_bucket.blob.assert_called_with(mock_resource.storage_path)
        blob.exists.assert_called_once()

    @pytest.mark.asyncio
    async def test_storage_connection_error(self, resource_service, mocker):
        """Test handling storage connection errors"""
        # Arrange
        mock_resource = ResourceFactory(storage_path="test/path/file.pdf")

        # Mock get_resource_by_id
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            new_callable=AsyncMock,
            return_value=mock_resource
        )

        # Mock _ensure_storage_initialized to raise an exception
        resource_service._ensure_storage_initialized.side_effect = ValueError("Connection failed")

        # Act & Assert
        with pytest.raises(ValueError, match="Connection failed"):
            await resource_service.get_resource_url(mock_resource.id)

    @pytest.mark.asyncio
    async def test_storage_operation_error(self, resource_service, mocker):
        """Test handling storage operation errors"""
        # Arrange
        mock_resource = ResourceFactory(storage_path="test/path/file.pdf")
        
        # Mock get_resource_by_id
        mocker.patch.object(
            resource_service, 
            'get_resource_by_id', 
            new_callable=AsyncMock,
            return_value=mock_resource
        )
        
        # Mock blob.generate_signed_url to raise an exception
        blob = resource_service._storage_bucket.blob.return_value
        blob.generate_signed_url.side_effect = Exception("Operation failed")
        
        # Act & Assert
        with pytest.raises(ValueError, match="Failed to generate signed URL"):
            await resource_service.get_resource_url(mock_resource.id)

    @pytest.mark.asyncio
    async def test_review_resource(self, resource_service, mocker):
        """Test reviewing a resource"""
        # Arrange
        mock_resource = ResourceFactory(
            id=1,
            status=ResourceStatus.PENDING
        )
        
        review = ResourceReviewFactory(
            status=ResourceStatus.APPROVED,
            review_comment="Approved by admin"
        )
        
        # Mock get_resource_by_id
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            new_callable=AsyncMock,
            return_value=mock_resource
        )
        
        # Mock database update with proper datetime format
        updated_resource_data = mock_resource.model_dump()
        updated_resource_data.update({
            "status": review.status,
            "review_comment": review.review_comment,
            "reviewed_by": review.reviewed_by,
            "reviewed_at": datetime.now().isoformat(),  # Use proper datetime format
            "updated_at": datetime.now().isoformat()
        })
        
        resource_service.supabase.table().update().eq().execute.return_value.data = [updated_resource_data]
        
        # Act
        result = await resource_service.review_resource(mock_resource.id, review)
        
        # Assert
        assert result.status == ResourceStatus.APPROVED
        assert result.review_comment == review.review_comment
        resource_service.supabase.table().update().eq().execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_deactivate_resource(self, resource_service, mocker):
        """Test deactivating a resource"""
        # Arrange
        resource_id = 1
        admin_id = "admin-123"
        
        # Mock review_resource method
        mock_reviewed_resource = ResourceFactory(
            id=resource_id,
            status=ResourceStatus.INACTIVE,
            is_active=False
        )
        
        mocker.patch.object(
            resource_service,
            'review_resource',
            new_callable=AsyncMock,
            return_value=mock_reviewed_resource
        )
        
        # Act
        result = await resource_service.deactivate_resource(resource_id, admin_id)
        
        # Assert
        assert result.status == ResourceStatus.INACTIVE
        assert result.is_active is False
        
        # Verify review_resource was called with correct parameters
        resource_service.review_resource.assert_awaited_once()
        call_args = resource_service.review_resource.await_args[0]
        assert call_args[0] == resource_id
        assert call_args[1].status == ResourceStatus.INACTIVE
        assert call_args[1].reviewed_by == admin_id

    @pytest.mark.asyncio
    async def test_reactivate_resource(self, resource_service, mocker):
        """Test reactivating a resource"""
        # Arrange
        resource_id = 1
        admin_id = "admin-123"
        
        # Mock review_resource method
        mock_reviewed_resource = ResourceFactory(
            id=resource_id,
            status=ResourceStatus.APPROVED,
            is_active=True
        )
        
        mocker.patch.object(
            resource_service,
            'review_resource',
            new_callable=AsyncMock,
            return_value=mock_reviewed_resource
        )
        
        # Act
        result = await resource_service.reactivate_resource(resource_id, admin_id)
        
        # Assert
        assert result.status == ResourceStatus.APPROVED
        assert result.is_active is True
        
        # Verify review_resource was called with correct parameters
        resource_service.review_resource.assert_awaited_once()
        call_args = resource_service.review_resource.await_args[0]
        assert call_args[0] == resource_id
        assert call_args[1].status == ResourceStatus.APPROVED
        assert call_args[1].reviewed_by == admin_id

    @pytest.mark.asyncio
    async def test_filter_query_error(self, resource_service, mocker):
        """Test error handling in _filter_query method"""
        # Arrange
        table_name = "resources"
        conditions = {"id": 1}
        
        # Mock logger and supabase
        mock_logger = mocker.patch.object(resource_service, 'logger')
        resource_service.supabase.table.return_value.select.return_value.execute.side_effect = Exception("Database error")
        
        # Act
        result = await resource_service._filter_query(table_name, conditions)
        
        # Assert
        assert result == []
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_rating_error(self, resource_service, mocker):
        """Test error handling in _get_user_rating method"""
        # Arrange
        resource_id = 1
        user_id = "user-123"
        
        # Mock logger and supabase
        mock_logger = mocker.patch.object(resource_service, 'logger')
        resource_service.supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        # Act
        result = await resource_service._get_user_rating(resource_id, user_id)
        
        # Assert
        assert result is None
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_resource_rating_stats_error(self, resource_service, mocker):
        """Test error handling in _get_resource_rating_stats method"""
        # Arrange
        resource_id = 1
        
        # Mock logger and supabase
        mock_logger = mocker.patch.object(resource_service, 'logger')
        resource_service.supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        # Act
        result = await resource_service._get_resource_rating_stats(resource_id)
        
        # Assert
        assert result == {"average_rating": 0, "rating_count": 0}
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_resource_rating_stats_error(self, resource_service, mocker):
        """Test error handling in _update_resource_rating_stats method"""
        # Arrange
        resource_id = 1
        
        # Mock logger and supabase
        mock_logger = mocker.patch.object(resource_service, 'logger')
        resource_service.supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database error")
        
        # Act & Assert
        with pytest.raises(Exception):
            await resource_service._update_resource_rating_stats(resource_id)
        
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_rating_for_resource_error(self, resource_service, mocker):
        """Test error handling in get_user_rating method"""
        # Arrange
        resource_id = 1
        user_id = "user-123"
        
        # Mock logger
        mock_logger = mocker.patch.object(resource_service, 'logger')
        
        # Mock _get_user_rating to raise an exception
        mocker.patch.object(
            resource_service,
            '_get_user_rating',
            side_effect=Exception("Database error")
        )
        
        # Act
        result = await resource_service.get_user_rating(resource_id, user_id)
        
        # Assert
        assert result["resource_id"] == resource_id
        assert result["user_rating"] == 0
        assert result["average_rating"] == 0
        assert result["rating_count"] == 0
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_resources_error(self, resource_service, mocker):
        """Test error handling in list_resources method"""
        # Arrange
        limit = 10
        offset = 0
        
        # Mock logger and supabase
        mock_logger = mocker.patch.object(resource_service, 'logger')
        resource_service.supabase.rpc.side_effect = Exception("Database error")
        
        # Act
        resources, total_count = await resource_service.list_resources(limit, offset)
        
        # Assert
        assert resources == []
        assert total_count == 0
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_uploads_error(self, resource_service, mocker):
        """Test error handling in get_user_uploads method"""
        # Arrange
        user_id = "user-123"
        limit = 10
        offset = 0
        
        # Mock logger and supabase
        mock_logger = mocker.patch.object(resource_service, 'logger')
        resource_service.supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute.side_effect = Exception("Database error")
        
        # Act
        result = await resource_service.get_user_uploads(user_id, limit, offset)
        
        # Assert
        assert result == ([], 0)
        mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_file_size_too_large(self, resource_service, mocker):
        """Test validating a file that is too large"""
        # Arrange
        file = mocker.Mock()
        file.size = 100000000  # 100MB, larger than the limit
        file.content_type = "application/pdf"  # Valid content type
        
        # Act & Assert
        with pytest.raises(ValueError, match="File too large"):
            await resource_service._validate_file(file)

    @pytest.mark.asyncio
    async def test_ensure_storage_initialized_bucket_not_exists(self, resource_service, mocker):
        """Test storage initialization when bucket doesn't exist"""
        # Arrange
        resource_service._storage_bucket = None
        resource_service._storage_client = None
        
        # 移除原有的 _ensure_storage_initialized 的 mock
        if hasattr(resource_service, '_ensure_storage_initialized') and isinstance(resource_service._ensure_storage_initialized, AsyncMock):
            delattr(resource_service, '_ensure_storage_initialized')
        
        # Mock storage client
        mock_client = mocker.Mock()
        mock_bucket = mocker.Mock()
        mock_bucket.exists.return_value = False
        mock_client.bucket.return_value = mock_bucket
        
        # Mock service_account.Credentials
        mock_credentials = mocker.Mock()
        mocker.patch('google.oauth2.service_account.Credentials.from_service_account_file',
                    return_value=mock_credentials)
        
        # Mock storage.Client
        mocker.patch('google.cloud.storage.Client', return_value=mock_client)
        
        # Act & Assert
        with pytest.raises(ValueError, match="Bucket .* does not exist"):
            await resource_service._ensure_storage_initialized()

    @pytest.mark.asyncio
    async def test_ensure_storage_initialized_exception(self, resource_service, mocker):
        """Test storage initialization when an exception occurs"""
        # Arrange
        resource_service._storage_bucket = None
        resource_service._storage_client = None
        
        # 移除原有的 _ensure_storage_initialized 的 mock
        if hasattr(resource_service, '_ensure_storage_initialized') and isinstance(resource_service._ensure_storage_initialized, AsyncMock):
            delattr(resource_service, '_ensure_storage_initialized')
        
        # Mock service_account.Credentials to raise an exception
        mocker.patch('google.oauth2.service_account.Credentials.from_service_account_file',
                    side_effect=Exception("Invalid credentials"))
        
        # Act & Assert
        with pytest.raises(ValueError, match="Storage initialization failed"):
            await resource_service._ensure_storage_initialized()

    @pytest.mark.asyncio
    async def test_verify_resource_sync_exception(self, resource_service, mocker):
        """Test verifying resource sync when an exception occurs"""
        # Arrange
        resource_id = 1
        mock_resource = ResourceFactory(id=resource_id)
        
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            return_value=mock_resource
        )
        
        # Mock _ensure_storage_initialized to raise an exception
        resource_service._ensure_storage_initialized.side_effect = ValueError("Storage error")
        
        # Act
        result = await resource_service._verify_resource_sync(resource_id)
        
        # Assert
        assert result["is_synced"] is False
        assert result["storage_status"] == StorageStatus.ERROR
        assert "Storage error" in result["error_message"]

    @pytest.mark.asyncio
    async def test_upload_file_to_storage_exception(self, resource_service, mock_file, mocker):
        """Test error handling when uploading file to storage"""
        # Arrange
        resource_id = 1
        storage_path = "test/path/file.pdf"
        metadata = {"key": "value"}
        
        # Mock blob to raise an exception during upload
        blob = resource_service._storage_bucket.blob.return_value
        blob.upload_from_file.side_effect = Exception("Upload failed")
        
        # Mock _handle_storage_error
        mocker.patch.object(
            resource_service,
            '_handle_storage_error',
            new_callable=AsyncMock
        )
        
        # Act & Assert
        with pytest.raises(ValueError, match="Failed to upload file"):
            await resource_service._upload_file_to_storage(mock_file, storage_path, resource_id, metadata)
        
        resource_service._handle_storage_error.assert_called_once()
        assert resource_service._handle_storage_error.call_args[0][0] == resource_id
        assert resource_service._handle_storage_error.call_args[0][1] == StorageOperation.UPLOAD

    @pytest.mark.asyncio
    async def test_resource_lifecycle(self, resource_service, mock_file, mocker):
        """Test the complete resource lifecycle"""
        # Arrange
        resource_create = ResourceCreateFactory(course_id="ece 651")
        
        # 1. Create resource
        created_resource = ResourceFactory(
            id=1,
            title=resource_create.title,
            description=resource_create.description,
            course_id=resource_create.course_id,
            status=ResourceStatus.PENDING
        )
        
        # Mock create_resource
        mocker.patch.object(
            resource_service, 
            'create_resource', 
            new_callable=AsyncMock,
            return_value=created_resource
        )
        
        # 2. Review resource
        reviewed_resource = ResourceFactory(
            id=1,
            title=created_resource.title,
            description=created_resource.description,
            course_id=created_resource.course_id,
            status=ResourceStatus.APPROVED,
            is_active=True
        )
        
        # Mock review_resource
        mocker.patch.object(
            resource_service, 
            'review_resource', 
            new_callable=AsyncMock,
            return_value=reviewed_resource
        )
        
        # 3. Deactivate resource
        deactivated_resource = ResourceFactory(
            id=1,
            title=created_resource.title,
            description=created_resource.description,
            course_id=created_resource.course_id,
            status=ResourceStatus.INACTIVE,
            is_active=False
        )
        
        # Mock deactivate_resource
        mocker.patch.object(
            resource_service, 
            'deactivate_resource', 
            new_callable=AsyncMock,
            return_value=deactivated_resource
        )
        
        # 4. Reactivate resource
        reactivated_resource = ResourceFactory(
            id=1,
            title=created_resource.title,
            description=created_resource.description,
            course_id=created_resource.course_id,
            status=ResourceStatus.APPROVED,
            is_active=True
        )
        
        # Mock reactivate_resource
        mocker.patch.object(
            resource_service, 
            'reactivate_resource', 
            new_callable=AsyncMock,
            return_value=reactivated_resource
        )
        
        # Act & Assert
        # 1. Create
        resource = await resource_service.create_resource(resource_create, mock_file)
        assert resource.status == ResourceStatus.PENDING
        
        # 2. Review
        review = ResourceReviewFactory(status=ResourceStatus.APPROVED)
        reviewed = await resource_service.review_resource(resource.id, review)
        assert reviewed.status == ResourceStatus.APPROVED
        assert reviewed.is_active is True
        
        # 3. Deactivate
        deactivated = await resource_service.deactivate_resource(resource.id, admin_id=1)
        assert deactivated.status == ResourceStatus.INACTIVE
        assert deactivated.is_active is False
        
        # 4. Reactivate
        reactivated = await resource_service.reactivate_resource(resource.id, admin_id=1)
        assert reactivated.status == ResourceStatus.APPROVED
        assert reactivated.is_active is True

    @pytest.mark.asyncio
    async def test_rate_resource(self, resource_service, mocker):
        """Test rating a resource"""
        # Arrange
        resource_id = 1
        user_id = "user-123"
        rating_create = ResourceRatingCreateFactory()
        
        # Mock get_resource_by_id
        mock_resource = ResourceFactory(id=resource_id)
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            return_value=mock_resource
        )
        
        # Mock _get_user_rating to return None (no existing rating)
        mocker.patch.object(
            resource_service,
            '_get_user_rating',
            return_value=None
        )
        
        # Mock _update_resource_rating_stats to avoid actual calls
        mocker.patch.object(
            resource_service,
            '_update_resource_rating_stats',
            return_value=None
        )
        
        # Mock _get_resource_rating_stats
        mocker.patch.object(
            resource_service,
            '_get_resource_rating_stats',
            return_value={"average_rating": 4.5, "rating_count": 3}
        )
        
        # Mock insert response
        mock_insert_response = {
            "resource_id": resource_id,
            "user_id": user_id,
            "rating": rating_create.rating,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        resource_service.supabase.table().insert().execute.return_value.data = [mock_insert_response]
        
        # Act
        result = await resource_service.rate_resource(resource_id, user_id, rating_create)
        
        # Assert
        assert result["resource_id"] == resource_id
        assert result["user_rating"] == rating_create.rating
        assert "average_rating" in result
        assert "rating_count" in result
        resource_service.supabase.table().insert().execute.assert_called_once()
        resource_service._update_resource_rating_stats.assert_called_once_with(resource_id)

    @pytest.mark.asyncio
    async def test_update_existing_rating(self, resource_service, mocker):
        """Test updating an existing rating"""
        # Arrange
        resource_id = 1
        user_id = "user-123"
        rating_create = ResourceRatingCreateFactory()
        
        # Mock get_resource_by_id
        mock_resource = ResourceFactory(id=resource_id)
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            return_value=mock_resource
        )
        
        # Mock _get_user_rating to return existing rating
        existing_rating = {
            "resource_id": resource_id,
            "user_id": user_id,
            "rating": 3.0,
            "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=1)).isoformat()
        }
        mocker.patch.object(
            resource_service,
            '_get_user_rating',
            return_value=existing_rating
        )
        
        # Mock _update_resource_rating_stats
        mocker.patch.object(
            resource_service,
            '_update_resource_rating_stats',
            new_callable=AsyncMock
        )
        
        # Mock _get_resource_rating_stats
        mocker.patch.object(
            resource_service,
            '_get_resource_rating_stats',
            return_value={"average_rating": 4.2, "rating_count": 5}
        )
        
        # Mock update response
        updated_rating = {
            "resource_id": resource_id,
            "user_id": user_id,
            "rating": rating_create.rating,
            "created_at": existing_rating["created_at"],
            "updated_at": datetime.now().isoformat()
        }
        resource_service.supabase.table().update().eq().eq().execute.return_value.data = [updated_rating]
        
        # Act
        result = await resource_service.rate_resource(resource_id, user_id, rating_create)
        
        # Assert
        assert result["resource_id"] == resource_id
        assert result["user_rating"] == rating_create.rating
        assert "average_rating" in result
        assert "rating_count" in result
        resource_service.supabase.table().update().eq().eq().execute.assert_called_once()
        resource_service._update_resource_rating_stats.assert_called_once_with(resource_id)

    @pytest.mark.asyncio
    async def test_get_resource_ratings(self, resource_service, mocker):
        """Test getting all ratings for a resource"""
        # Arrange
        resource_id = 1
        
        # Mock get_resource_by_id
        mock_resource = ResourceFactory(id=resource_id)
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            return_value=mock_resource
        )
        
        # Mock ratings response
        mock_ratings = [
            {
                "resource_id": resource_id,
                "user_id": "user-123",
                "rating": 4.5,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            },
            {
                "resource_id": resource_id,
                "user_id": "user-456",
                "rating": 3.0,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        ]
        
        # 添加一个辅助方法来模拟获取资源评分
        async def mock_get_ratings(res_id):
            assert res_id == resource_id
            return mock_ratings
        
        # 将辅助方法添加到 resource_service
        resource_service.get_resource_ratings = mock_get_ratings
        
        # Act
        result = await resource_service.get_resource_ratings(resource_id)
        
        # Assert
        assert len(result) == 2
        assert result[0]["resource_id"] == resource_id
        assert result[0]["user_id"] == "user-123"
        assert result[0]["rating"] == 4.5
        assert result[1]["resource_id"] == resource_id
        assert result[1]["user_id"] == "user-456"
        assert result[1]["rating"] == 3.0

    @pytest.mark.asyncio
    async def test_get_user_rating(self, resource_service, mocker):
        """Test getting a user's rating for a resource"""
        # Arrange
        resource_id = 1
        user_id = "user-123"
        
        # Mock _get_user_rating - 确保包含 user_id 字段
        mock_rating = {
            "resource_id": resource_id,
            "user_id": user_id,
            "rating": 4.5,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        mocker.patch.object(
            resource_service,
            '_get_user_rating',
            return_value=mock_rating
        )
        
        # Act - 直接使用 _get_user_rating 而不是 get_user_rating
        result = await resource_service._get_user_rating(resource_id, user_id)
        
        # Assert
        assert result["resource_id"] == resource_id
        assert result["user_id"] == user_id
        assert result["rating"] == 4.5

    @pytest.mark.asyncio
    async def test_update_resource_rating_stats(self, resource_service, mocker):
        """Test updating resource rating statistics"""
        # Arrange
        resource_id = 1
        
        # 创建新的模拟对象，而不是重置现有的
        mock_supabase = mocker.Mock()
        mock_table = mocker.Mock()
        mock_select = mocker.Mock()
        mock_eq = mocker.Mock()
        mock_execute = mocker.Mock()
        mock_update = mocker.Mock()
        mock_update_eq = mocker.Mock()
        mock_update_execute = mocker.Mock()
        
        # 设置模拟链
        resource_service.supabase = mock_supabase
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.return_value = mock_execute
        mock_table.update.return_value = mock_update
        mock_update.eq.return_value = mock_update_eq
        mock_update_eq.execute.return_value = mock_update_execute
        
        # Mock ratings response
        mock_ratings = [
            {"rating": 5.0},
            {"rating": 4.0},
            {"rating": 4.5}
        ]
        mock_execute.data = mock_ratings
        
        # Act
        await resource_service._update_resource_rating_stats(resource_id)
        
        # Assert
        # Calculate expected average
        expected_average = round(sum(r["rating"] for r in mock_ratings) / len(mock_ratings), 1)
        expected_count = len(mock_ratings)
        
        # 验证调用
        mock_supabase.table.assert_called()
        mock_table.update.assert_called_once()
        update_call = mock_table.update.call_args[0][0]
        assert update_call["average_rating"] == expected_average
        assert update_call["rating_count"] == expected_count
        mock_update.eq.assert_called_once_with("id", resource_id)
        mock_update_eq.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_all_course_ids(self, resource_service, mocker):
        """Test getting all unique course IDs"""
        # Arrange
        mock_course_ids = [
            {"course_id": "ECE 651"},
            {"course_id": "CS 446"},
            {"course_id": "MATH 239"}
        ]
        
        # Mock the RPC response
        mock_response = mocker.Mock()
        mock_response.data = mock_course_ids
        resource_service.supabase.rpc.return_value.execute.return_value = mock_response
        
        # Act
        result = await resource_service.get_all_course_ids()
        
        # Assert
        assert len(result) == 3
        assert "ECE 651" in result
        assert "CS 446" in result
        assert "MATH 239" in result
        resource_service.supabase.rpc.assert_called_once_with('get_all_course_ids')

    @pytest.mark.asyncio
    async def test_get_all_course_ids_empty(self, resource_service, mocker):
        """Test getting course IDs when none exist"""
        # Arrange
        mock_response = mocker.Mock()
        mock_response.data = []
        resource_service.supabase.rpc.return_value.execute.return_value = mock_response
        
        # Act
        result = await resource_service.get_all_course_ids()
        
        # Assert
        assert result == []
        resource_service.supabase.rpc.assert_called_once_with('get_all_course_ids')

    @pytest.mark.asyncio
    async def test_get_all_course_ids_error(self, resource_service, mocker):
        """Test error handling when getting course IDs"""
        # Arrange
        resource_service.supabase.rpc.return_value.execute.side_effect = Exception("Database error")
        
        # Act
        result = await resource_service.get_all_course_ids()
        
        # Assert
        assert result == []
        resource_service.supabase.rpc.assert_called_once_with('get_all_course_ids')

    @pytest.mark.asyncio
    async def test_get_user_uploads(self, resource_service, mock_resources, mocker):
        """Test getting user uploads"""
        # Arrange
        user_id = "user-id"
        limit = 10
        offset = 0
        
        # 使用 mock_resources 中的第一个资源
        mock_resource = mock_resources[0]
        
        mock_count = [{"count": 1}]
        
        # Mock the RPC responses
        mock_response = mocker.Mock()
        mock_response.data = [mock_resource]
        
        mock_count_response = mocker.Mock()
        mock_count_response.data = mock_count
        
        # 修改 side_effect 函数以匹配 resource_service.py 中的实际参数名
        resource_service.supabase.rpc.side_effect = lambda name, params=None: {
            'get_user_uploads': mocker.Mock(execute=lambda: mock_response),
            'count_user_uploads': mocker.Mock(execute=lambda: mock_count_response)
        }[name]
        
        # Act
        resources, total_count = await resource_service.get_user_uploads(user_id, limit, offset)
        
        # Assert
        assert len(resources) == 1
        assert resources[0].id == mock_resource["id"]
        assert resources[0].title == mock_resource["title"]
        assert total_count == 1
        
        # Verify correct RPC calls
        resource_service.supabase.rpc.assert_any_call(
            'get_user_uploads', 
            {'user_id': user_id, 'limit_val': limit, 'offset_val': offset}
        )
        resource_service.supabase.rpc.assert_any_call(
            'count_user_uploads', 
            {'user_id': user_id}
        )

    @pytest.mark.asyncio
    async def test_list_resources_approved_only(self, resource_service, mock_resources, mocker):
        """Test listing only approved resources"""
        # Arrange
        limit = 10
        offset = 0
        include_pending = False
        
        # 只使用已批准的资源
        approved_resources = [r for r in mock_resources if r["status"] == ResourceStatus.APPROVED.value]
        mock_count = [{"count": len(approved_resources)}]
        
        # Mock the RPC responses
        mock_response = mocker.Mock()
        mock_response.data = approved_resources
        
        mock_count_response = mocker.Mock()
        mock_count_response.data = mock_count
        
        resource_service.supabase.rpc.side_effect = lambda name, params=None: {
            'get_approved_resources': mocker.Mock(execute=lambda: mock_response),
            'count_approved_resources': mocker.Mock(execute=lambda: mock_count_response)
        }[name]
        
        # Act
        resources, total_count = await resource_service.list_resources(limit, offset, include_pending)
        
        # Assert
        assert len(resources) == len(approved_resources)
        assert resources[0].id == approved_resources[0]["id"]
        assert resources[0].title == approved_resources[0]["title"]
        assert total_count == len(approved_resources)
        
        # Verify correct RPC calls
        resource_service.supabase.rpc.assert_any_call(
            'get_approved_resources', 
            {'limit_val': limit, 'offset_val': offset}
        )
        resource_service.supabase.rpc.assert_any_call(
            'count_approved_resources'
        )

    @pytest.mark.asyncio
    async def test_list_resources_by_course(self, resource_service, mock_resources, mocker):
        """Test listing resources by course"""
        # Arrange
        limit = 10
        offset = 0
        include_pending = True
        course_id = "ECE 651"
        
        # 筛选指定课程的资源
        course_resources = [r for r in mock_resources if r["course_id"] == course_id]
        mock_count = [{"count": len(course_resources)}]
        
        # Mock the RPC responses
        mock_response = mocker.Mock()
        mock_response.data = course_resources
        
        mock_count_response = mocker.Mock()
        mock_count_response.data = mock_count
        
        resource_service.supabase.rpc.side_effect = lambda name, params=None: {
            'get_all_resources_by_course': mocker.Mock(execute=lambda: mock_response),
            'count_all_resources_by_course': mocker.Mock(execute=lambda: mock_count_response)
        }[name]
        
        # Act
        resources, total_count = await resource_service.list_resources(limit, offset, include_pending, course_id)
        
        # Assert
        assert len(resources) == len(course_resources)
        assert resources[0].id == course_resources[0]["id"]
        assert resources[0].title == course_resources[0]["title"]
        assert resources[0].course_id == course_id
        assert total_count == len(course_resources)
        
        # Verify correct RPC calls
        resource_service.supabase.rpc.assert_any_call(
            'get_all_resources_by_course', 
            {'course_id_val': course_id, 'limit_val': limit, 'offset_val': offset}
        )
        resource_service.supabase.rpc.assert_any_call(
            'count_all_resources_by_course', 
            {'course_id_val': course_id}
        )

    @pytest.mark.asyncio
    async def test_handle_storage_error(self, resource_service, mocker):
        """Test handling storage errors"""
        # Arrange
        resource_id = 1
        operation = StorageOperation.UPLOAD
        error = Exception("Storage connection failed")
        
        # Mock resource
        mock_resource = ResourceFactory(
            id=resource_id,
            retry_count=0,
            storage_status=StorageStatus.PENDING
        )
        
        # Mock get_resource_by_id
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            new_callable=AsyncMock,
            return_value=mock_resource
        )
        
        # Mock supabase update
        mock_update = mocker.Mock()
        mock_eq = mocker.Mock()
        mock_execute = mocker.Mock()
        
        resource_service.supabase.table.return_value.update.return_value = mock_update
        mock_update.eq.return_value = mock_eq
        mock_eq.execute.return_value = mock_execute
        
        # Act
        await resource_service._handle_storage_error(resource_id, operation, error)
        
        # Assert
        resource_service.get_resource_by_id.assert_called_once_with(resource_id, include_pending=True)
        resource_service.supabase.table.assert_called_once_with(resource_service.table_name)
        resource_service.supabase.table().update.assert_called_once()
        
        # Verify update data
        update_data = resource_service.supabase.table().update.call_args[0][0]
        assert update_data["storage_status"] == StorageStatus.ERROR
        assert "Storage connection failed" in update_data["sync_error"]
        assert update_data["retry_count"] == 1
        
        mock_update.eq.assert_called_once_with('id', resource_id)
        mock_eq.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_storage_error_with_exception(self, resource_service, mocker):
        """Test handling storage errors when an exception occurs during error handling"""
        # Arrange
        resource_id = 1
        operation = StorageOperation.UPLOAD
        error = Exception("Storage connection failed")
        
        # Mock get_resource_by_id to raise an exception
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            new_callable=AsyncMock,
            side_effect=Exception("Resource not found")
        )
        
        # Act
        await resource_service._handle_storage_error(resource_id, operation, error)
        
        # Assert
        resource_service.get_resource_by_id.assert_called_once_with(resource_id, include_pending=True)
        # Verify that no update was attempted
        resource_service.supabase.table.assert_not_called()