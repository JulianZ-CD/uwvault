import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from fastapi.exceptions import HTTPException
import hashlib
import io

from api.routers.resources_router import router
from api.models.resource import ResourceStatus, ResourceCreate, ResourceReview
from api.core.exceptions import NotFoundError, ValidationError, StorageError
from api.core.mock_auth import MockUser
from api.tests.factories import (
    ResourceFactory, ResourceCreateFactory, 
    ResourceUpdateFactory, ResourceReviewFactory,
    FileFactory
)

# 创建测试应用
@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(router)
    return app

@pytest.fixture
def test_client(test_app):
    return TestClient(test_app)

# Mock 用户
@pytest.fixture
def mock_normal_user():
    return MockUser(
        id=1,
        username="test_user",
        is_admin=False
    )

@pytest.fixture
def mock_admin_user():
    return MockUser(
        id=999,
        username="admin",
        is_admin=True
    )

# 测试文件
@pytest.fixture
def test_file():
    return FileFactory.create()

# Mock ResourceService
@pytest.fixture
def mock_resource_service():
    return AsyncMock()

@pytest.mark.integration
class TestResourceRouter:
    BASE_URL = "/api/py/resources"

    @pytest.mark.asyncio
    async def test_get_resource_success(
        self, test_client, mock_normal_user, mock_resource_service
    ):
        """test get resource"""
        resource_id = 1
        mock_resource = ResourceFactory(id=resource_id)
        
        # ues AsyncMock
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=mock_resource)
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == resource_id

    @pytest.mark.asyncio
    async def test_create_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, test_file
    ):
        """test create resource"""
        # calculate file hash
        file_content = test_file["content"]
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # handle file and form data separately
        files = {
            "file": (
                test_file["filename"],
                io.BytesIO(test_file["content"]),
                test_file["content_type"]
            )
        }
        
        # use form data format
        form_data = {
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "1",
        }
        
        # set mock return value
        mock_resource = ResourceFactory(
            title=form_data["title"],
            description=form_data["description"],
            course_id=form_data["course_id"],
            created_by=mock_normal_user.id,
            updated_by=mock_normal_user.id,
            file_hash=file_hash,
            original_filename=test_file["filename"]
        )
        
        # use AsyncMock
        mock_resource_service.create_resource = AsyncMock(return_value=mock_resource)
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.post(
                    f"{self.BASE_URL}/create",
                    files=files,
                    data=form_data
                )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == form_data["title"]
        assert response.json()["created_by"] == mock_normal_user.id

    async def test_update_resource_success(
        self, test_client, mock_normal_user, mock_resource_service
    ):
        """test update resource"""
        resource_id = 1
        
        # use form data format
        form_data = {
            "title": "Updated Title",
            "description": "Updated Description",
            "course_id": "2"
        }
        
        # set mock return value
        updated_resource = ResourceFactory(
            id=resource_id,
            title=form_data["title"],
            description=form_data["description"],
            course_id=form_data["course_id"],
            updated_by=mock_normal_user.id
        )
        
        # use AsyncMock
        mock_resource_service.update_resource = AsyncMock(return_value=updated_resource)
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.patch(
                    f"{self.BASE_URL}/{resource_id}",
                    data=form_data
                )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == form_data["title"]
        assert response.json()["description"] == form_data["description"]

    @pytest.mark.asyncio
    async def test_review_resource_success(
        self, test_client, mock_admin_user, mock_resource_service
    ):
        """test review resource"""
        resource_id = 1
        
        review_data = {
            "status": ResourceStatus.APPROVED.value,
            "review_comment": "Approved",
            "reviewed_by": mock_admin_user.id
        }
        
        # create a awaitable return value
        reviewed_resource = ResourceFactory(
            id=resource_id,
            status=ResourceStatus.APPROVED,
            review_comment=review_data["review_comment"],
            reviewed_by=mock_admin_user.id
        )
        
        # use AsyncMock
        mock_resource_service.review_resource = AsyncMock(return_value=reviewed_resource)
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.require_admin", return_value=mock_admin_user):
                response = test_client.post(
                    f"{self.BASE_URL}/{resource_id}/review",
                    json=review_data
                )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == ResourceStatus.APPROVED.value

    # error case test
    async def test_get_resource_not_found(
        self, test_client, mock_normal_user, mock_resource_service
    ):
        """test get non-existent resource"""
        resource_id = 9999
        
        # set mock throw exception
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=NotFoundError(f"Resource with id {resource_id} not found")
        )
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_create_resource_invalid_file(
        self, test_client, mock_normal_user, mock_resource_service
    ):
        """test create resource with invalid file"""
        # use invalid file type
        files = {
            "file": (
                "test.exe",
                io.BytesIO(b"invalid content"),
                "application/x-msdownload"
            )
        }
        
        form_data = {
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "1"
        }
        
        # set mock throw exception
        mock_resource_service.create_resource = AsyncMock(
            side_effect=ValidationError("Invalid file type")
        )
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.post(
                    f"{self.BASE_URL}/create",
                    files=files,
                    data=form_data
                )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # server error test
    async def test_get_resource_server_error(
        self, test_client, mock_normal_user, mock_resource_service
    ):
        """test get resource server error"""
        resource_id = 1
        
        # set mock throw exception
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=Exception("Database connection error")
        )
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to get resource"

    async def test_get_resource_url(
        self, test_client, mock_normal_user, mock_resource_service
    ):
        """test get resource download url"""
        resource_id = 1
        signed_url = "https://storage.googleapis.com/test-bucket/test-file.pdf?signature=abc123"
        
        # use AsyncMock
        mock_resource_service.get_resource_url = AsyncMock(return_value=signed_url)
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.get_current_user", return_value=mock_normal_user):
                response = test_client.get(f"{self.BASE_URL}/{resource_id}/download")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == signed_url

    async def test_delete_resource_success(
        self, test_client, mock_admin_user, mock_resource_service
    ):
        """test delete resource"""
        resource_id = 1
        
        # use AsyncMock
        mock_resource_service.delete_resource = AsyncMock(return_value=True)
        
        with patch("api.routers.resources_router.resource_service", mock_resource_service):
            with patch("api.routers.resources_router.require_admin", return_value=mock_admin_user):
                response = test_client.delete(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Resource deleted successfully" 