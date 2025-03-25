import pytest
from datetime import datetime, timedelta
from fastapi import UploadFile
from api.services.resource_service import ResourceService
from api.models.resource import (
    ResourceCreate, ResourceUpdate, ResourceInDB, ResourceReview,
    ResourceStatus, StorageStatus, StorageOperation,
)
from api.core.exceptions import NotFoundError, ValidationError, StorageOperationError, StorageError, StorageConnectionError
from api.tests.factories import ResourceFactory, ResourceCreateFactory, ResourceReviewFactory, ResourceUpdateFactory
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
    def resource_service(self, mocker, mock_gcp_storage):
        """Resource service fixture with mocked dependencies"""
        # create a correct mock Supabase client
        mock_supabase = mocker.Mock()
        mock_table = mocker.Mock()
        mock_supabase.table = mocker.Mock(return_value=mock_table)
        
        # mock table operation method chain
        mock_table.select = mocker.Mock(return_value=mock_table)
        mock_table.insert = mocker.Mock(return_value=mock_table)
        mock_table.update = mocker.Mock(return_value=mock_table)
        mock_table.delete = mocker.Mock(return_value=mock_table)
        mock_table.eq = mocker.Mock(return_value=mock_table)
        mock_table.order = mocker.Mock(return_value=mock_table)
        mock_table.limit = mocker.Mock(return_value=mock_table)
        mock_table.offset = mocker.Mock(return_value=mock_table)
        mock_table.single = mocker.Mock(return_value=mock_table)
        mock_table.execute = mocker.Mock()
        mock_table.execute.return_value = mocker.Mock(data=[], count=0)
        
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
        mock_response.data = {
            "id": 1,
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "ece 651",
            "created_by": 1,
            "updated_by": 1,
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
            "retry_count": 0
        }
        resource_service.supabase.table().select().eq().single().execute.return_value = mock_response

        # Act
        result = await resource_service.get_resource_by_id(1)

        # Assert
        assert result.id == 1
        assert result.title == "Test Resource"
        assert result.course_id == "ece 651"
        resource_service.supabase.table.assert_called_with("resources")

    @pytest.mark.asyncio
    async def test_get_resource_by_id_not_found(self, resource_service, mocker):
        """Test getting a non-existent resource"""
        # set mock response - empty data
        mock_response = mocker.Mock()
        mock_response.data = None
        resource_service.supabase.table().select().eq().single().execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(NotFoundError):
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
        with pytest.raises(ValidationError, match="Invalid file type"):
            await resource_service.create_resource(resource_create, mock_file)

    @pytest.mark.asyncio
    async def test_update_resource(self, resource_service, mocker):
        """Test updating an existing resource"""
        # Arrange
        original_resource = ResourceFactory()
        update_data = ResourceUpdate(
            title="Updated Title",
            description="Updated Description",
            updated_by=1
        )
        
        updated_resource_data = original_resource.model_dump()
        updated_resource_data.update(update_data.model_dump(exclude_unset=True))
        
        resource_service.supabase.table().update().eq().execute.return_value.data = [updated_resource_data]
        mocker.patch.object(resource_service, 'get_resource_by_id', return_value=original_resource)

        # Act
        result = await resource_service.update_resource(original_resource.id, update_data)

        # Assert
        assert result.title == update_data.title
        assert result.description == update_data.description
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
        resource_service._ensure_storage_initialized.side_effect = StorageConnectionError("Connection failed")
        
        # Act & Assert
        with pytest.raises(StorageOperationError, match="get_url failed: Connection failed"):
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
        with pytest.raises(StorageOperationError):
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
        admin_id = 999
        
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
        admin_id = 999
        
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