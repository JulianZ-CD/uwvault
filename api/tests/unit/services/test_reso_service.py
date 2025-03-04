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
from api.utils.file_handlers import ResourceType


@pytest.mark.unit
class TestResourceService:
    @pytest.fixture
    def resource_service(self, mocker):
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
        
        # mock storage manager
        mock_storage = mocker.Mock()
        mock_storage._ensure_initialized = mocker.AsyncMock()
        mock_storage.upload_file = mocker.AsyncMock()
        mock_storage.delete_file = mocker.AsyncMock()
        mock_storage.get_signed_url = mocker.AsyncMock()
        mock_storage.verify_file_exists = mocker.AsyncMock()
        
        # create service instance
        service = ResourceService()
        service.supabase = mock_supabase
        service.storage = mock_storage
        service.table_name = "resources"
        
        return service

    @pytest.fixture
    def mock_file(self):
        """Mock UploadFile for testing"""
        file = Mock(spec=UploadFile)
        file.filename = "test.pdf"
        file.content_type = "application/pdf"
        file.size = 1024
        file.file = BytesIO(b"test content")
        return file

    @pytest.mark.asyncio
    async def test_get_resource_by_id(self, resource_service, mocker):
        """Test getting a single resource by ID"""
        mock_data = {
            "id": 1,
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "ece 651",
            "file_type": "pdf",
            "file_size": 1024,
            "storage_path": "test/path/file.pdf",
            "mime_type": "application/pdf",
            "created_by": 1,
            "updated_by": 1,
            "file_hash": "test_hash",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": ResourceStatus.APPROVED,
            "storage_status": StorageStatus.SYNCED,
            "is_active": True,
            "retry_count": 0,
            "last_sync_at": datetime.now().isoformat()
        }
        
        # set mock response
        mock_response = mocker.Mock()
        mock_response.data = mock_data
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
        
        # mock file handling
        mocker.patch('api.utils.file_handlers.FileHandler.validate_file_type', return_value=True)
        mocker.patch('api.utils.file_handlers.FileHandler.validate_file_size', return_value=True)
        mocker.patch('api.utils.file_handlers.FileHandler.generate_safe_filename', return_value="safe_filename.pdf")
        mocker.patch('api.utils.file_handlers.FileHandler.generate_storage_path', return_value="test/path/safe_filename.pdf")
        mocker.patch('api.utils.file_handlers.FileHandler.calculate_file_hash', return_value="test_hash")
        
        # mock storage upload
        resource_service.storage.upload_file.return_value = "test/path/safe_filename.pdf"
        
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
        resource_service.storage.upload_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_resource_invalid_file(self, resource_service, mocker):
        """Test creating resource with invalid file"""
        # Arrange
        mock_file = mocker.Mock(spec=UploadFile)
        mock_file.content_type = "invalid/type"
        resource_create = ResourceCreateFactory()
        
        mocker.patch('api.utils.file_handlers.FileHandler.validate_file_type', return_value=False)

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
        
        # use AsyncMock to mock asynchronous delete method
        resource_service.storage.delete_file = mocker.AsyncMock()
        resource_service.supabase.table().delete().eq().execute.return_value.data = [mock_resource.model_dump()]

        # Act
        result = await resource_service.delete_resource(mock_resource.id)

        # Assert
        assert result is True
        resource_service.storage.delete_file.assert_called_once_with(mock_resource.storage_path)
        resource_service.supabase.table().delete().eq().execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_resource_url(self, resource_service, mocker):
        """Test getting resource download URL"""
        # Arrange
        mock_resource = ResourceFactory(course_id="ece 651")
        mock_url = "https://test-url.com/resource"
        
        async def mock_get_resource(*args, **kwargs):
            return mock_resource
        mocker.patch.object(resource_service, 'get_resource_by_id', side_effect=mock_get_resource)
        
        async def mock_get_url(*args, **kwargs):
            return mock_url
        resource_service.storage.get_signed_url = mocker.AsyncMock(side_effect=mock_get_url)

        # Act
        result = await resource_service.get_resource_url(mock_resource.id)

        # Assert
        assert result == mock_url
        resource_service.storage.get_signed_url.assert_called_once()

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

        # Mock file handling
        mocker.patch('api.utils.file_handlers.FileHandler.validate_file_type', return_value=True)
        mocker.patch('api.utils.file_handlers.FileHandler.validate_file_size', return_value=True)
        mocker.patch('api.utils.file_handlers.FileHandler.generate_storage_path',
                    return_value="test/path/file.pdf")
        mocker.patch('api.utils.file_handlers.FileHandler.get_file_extension', return_value="pdf")

        # Mock database operations
        mock_response = mocker.Mock()
        mock_response.data = [mock_resource.model_dump()]
        resource_service.supabase.table().insert().execute.return_value = mock_response

        # Mock storage operations
        resource_service.storage.upload_file = mocker.AsyncMock()
        mocker.patch.object(resource_service, '_update_sync_status', new_callable=AsyncMock)

        # Act
        result = await resource_service.create_resource(resource_create, mock_file)

        # Assert
        assert result.status == ResourceStatus.UPLOADING
        assert result.storage_status == StorageStatus.PENDING
        resource_service.storage.upload_file.assert_called_once()

        # fix: use upload_file.call_args
        upload_call = resource_service.storage.upload_file.call_args
        assert upload_call.kwargs['content_type'] == mock_file.content_type
        assert 'metadata' in upload_call.kwargs
        metadata = upload_call.kwargs['metadata']
        assert metadata['resource_id'] == str(result.id)
        assert metadata['file_type'] == "pdf"

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
        
        # Mock verify_file_exists to return True
        resource_service.storage.verify_file_exists.return_value = True
        
        # Mock _update_sync_status
        mocker.patch.object(
            resource_service, 
            '_update_sync_status', 
            new_callable=AsyncMock
        )
        
        # Act
        result = await resource_service.verify_resource_sync(mock_resource.id)
        
        # Assert
        assert result["is_synced"] is True
        assert result["storage_status"] == StorageStatus.SYNCED
        assert result["error_message"] is None
        resource_service.storage.verify_file_exists.assert_called_with(mock_resource.storage_path)

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
        
        # Mock storage connection error
        connection_error = StorageConnectionError("Failed to connect to storage")
        resource_service.storage.verify_file_exists.side_effect = connection_error
        
        # Act
        result = await resource_service.verify_resource_sync(mock_resource.id)
        
        # Assert
        assert result["is_synced"] is False
        assert result["storage_status"] == StorageStatus.ERROR
        assert "Failed to connect to storage" in result["error_message"]

    @pytest.mark.asyncio
    async def test_handle_storage_error(self, resource_service, mocker):
        """Test handling storage errors"""
        # Arrange
        resource_id = 1
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
        
        # Mock database update
        mock_update = mocker.Mock()
        mock_update.eq.return_value.execute.return_value = mocker.Mock()
        resource_service.supabase.table().update.return_value = mock_update
        
        # Act
        await resource_service._handle_storage_error(
            resource_id, 
            StorageOperation.UPLOAD, 
            Exception("Test error")
        )
        
        # Assert
        resource_service.supabase.table.assert_called_with(resource_service.table_name)
        resource_service.supabase.table().update.assert_called_once()
        
        # verify updated data contains correct fields
        update_call = resource_service.supabase.table().update.call_args
        update_data = update_call[0][0]
        assert update_data["storage_status"] == StorageStatus.ERROR
        assert "Test error" in update_data["sync_error"]
        assert update_data["retry_count"] == mock_resource.retry_count + 1

    @pytest.mark.asyncio
    async def test_review_resource(self, resource_service, mocker):
        """Test reviewing a resource"""
        # Arrange
        mock_resource = ResourceFactory(status=ResourceStatus.PENDING)
        review_data = ResourceReviewFactory(
            status=ResourceStatus.APPROVED,
            reviewed_by=1
        )
        
        mocker.patch.object(
            resource_service,
            'get_resource_by_id',
            return_value=mock_resource
        )
        
        updated_resource = mock_resource.model_dump()
        updated_resource.update({
            "status": review_data.status,
            "review_comment": review_data.review_comment,
            "reviewed_by": review_data.reviewed_by,
            "is_active": True
        })
        
        resource_service.supabase.table().update().eq().execute.return_value.data = [updated_resource]

        # Act
        result = await resource_service.review_resource(mock_resource.id, review_data)

        # Assert
        assert result.status == ResourceStatus.APPROVED
        assert result.reviewed_by == review_data.reviewed_by
        assert result.is_active is True

    @pytest.mark.asyncio
    async def test_deactivate_resource(self, resource_service, mocker):
        """Test deactivating a resource"""
        # Arrange
        mock_resource = ResourceFactory(status=ResourceStatus.APPROVED)
        admin_id = 1
        
        mocker.patch.object(
            resource_service,
            'review_resource',
            return_value=ResourceFactory(
                status=ResourceStatus.INACTIVE,
                is_active=False
            )
        )

        # Act
        result = await resource_service.deactivate_resource(mock_resource.id, admin_id)

        # Assert
        assert result.status == ResourceStatus.INACTIVE
        assert result.is_active is False
        resource_service.review_resource.assert_called_once()

    @pytest.mark.asyncio
    async def test_reactivate_resource(self, resource_service, mocker):
        """Test reactivating a resource"""
        # Arrange
        mock_resource = ResourceFactory(
            status=ResourceStatus.INACTIVE,
            is_active=False
        )
        admin_id = 1
        
        mocker.patch.object(
            resource_service,
            'review_resource',
            return_value=ResourceFactory(
                status=ResourceStatus.APPROVED,
                is_active=True
            )
        )

        # Act
        result = await resource_service.reactivate_resource(mock_resource.id, admin_id)

        # Assert
        assert result.status == ResourceStatus.APPROVED
        assert result.is_active is True
        resource_service.review_resource.assert_called_once()

    @pytest.mark.asyncio
    async def test_resource_lifecycle(self, resource_service, mock_file, mocker):
        """Test complete resource lifecycle"""
        # 1. Create resource
        resource_create = ResourceCreateFactory(course_id="ece 651")
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
    async def test_storage_operation_error(self, resource_service, mocker):
        """Test handling storage operation errors"""
        # Arrange
        mock_resource = ResourceFactory(course_id="ece 651")
        
        # Mock the logger
        mock_logger = mocker.Mock()
        resource_service.logger = mock_logger
        
        # Mock get_resource_by_id
        mocker.patch.object(
            resource_service, 
            'get_resource_by_id', 
            new_callable=AsyncMock,
            return_value=mock_resource
        )
        
        # Mock storage error
        storage_error = StorageError("Failed to delete file")
        resource_service.storage.delete_file.side_effect = storage_error
        
        # Mock the database delete to avoid actual deletion
        mock_response = mocker.Mock()
        mock_response.data = [mock_resource.model_dump()]
        resource_service.supabase.table().delete().eq().execute.return_value = mock_response

        # Act & Assert
        with pytest.raises(StorageOperationError) as exc_info:
            await resource_service.delete_resource(mock_resource.id)
        
        # Verify error handling
        assert "delete" in str(exc_info.value)
        assert "Failed to delete file" in str(exc_info.value)
        
        # Verify logging
        mock_logger.error.assert_called()
        assert "Storage error" in mock_logger.error.call_args_list[0][0][0] 