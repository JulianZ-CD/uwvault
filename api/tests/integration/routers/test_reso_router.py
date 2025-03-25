import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from fastapi.exceptions import HTTPException
import hashlib
import io
from api.routers.resources_router import get_resource_service, get_current_user, require_admin, security
from api.routers.resources_router import router
from api.models.resource import ResourceStatus, ResourceCreate, ResourceReview
from api.core.exceptions import NotFoundError, ValidationError, StorageError
from api.tests.conftest import MockUser
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

# 测试文件
@pytest.fixture
def test_file():
    return FileFactory.create()

# Mock ResourceService
@pytest.fixture
def mock_resource_service():
    return AsyncMock()

# 在 test_reso_router.py 中添加
@pytest.fixture
def mock_security():
    """模拟安全依赖"""
    mock = Mock()
    mock.credentials = "test-token"
    return mock

@pytest.fixture
def setup_dependencies(test_app, mock_normal_user, mock_resource_service, mock_security):
    """设置依赖项覆盖"""
    app = test_app
    
    # 保存原始依赖项以便稍后恢复
    original_overrides = app.dependency_overrides.copy()
    
    # 设置依赖项覆盖
    app.dependency_overrides[get_resource_service] = lambda: mock_resource_service
    app.dependency_overrides[get_current_user] = lambda: mock_normal_user
    app.dependency_overrides[security] = lambda: mock_security
    
    yield
    
    # 测试后恢复原始依赖项
    app.dependency_overrides = original_overrides

@pytest.fixture
def setup_admin_dependencies(test_app, mock_admin_user, mock_resource_service, mock_security):
    """设置管理员依赖项覆盖"""
    app = test_app
    
    # 保存原始依赖项以便稍后恢复
    original_overrides = app.dependency_overrides.copy()
    
    # 设置依赖项覆盖
    app.dependency_overrides[get_resource_service] = lambda: mock_resource_service
    app.dependency_overrides[require_admin] = lambda: mock_admin_user
    app.dependency_overrides[security] = lambda: mock_security
    
    yield
    
    # 测试后恢复原始依赖项
    app.dependency_overrides = original_overrides

@pytest.mark.integration
class TestResourceRouter:
    BASE_URL = "/api/py/resources"

    @pytest.mark.asyncio
    async def test_get_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test get resource"""
        resource_id = 1
        mock_resource = ResourceFactory(
            id=resource_id,
            status=ResourceStatus.APPROVED,
            created_by=mock_normal_user.id
        )
        
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=mock_resource)
        
        # 不需要 patch，因为依赖项已经在 setup_dependencies 夹具中被覆盖
        response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == resource_id

    @pytest.mark.asyncio
    async def test_create_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, test_file, setup_dependencies
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
        
        response = test_client.post(f"{self.BASE_URL}/create", files=files, data=form_data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == form_data["title"]
        assert response.json()["created_by"] == mock_normal_user.id

    async def test_update_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test update resource"""
        resource_id = 1
        
        # use form data format
        form_data = {
            "title": "Updated Title",
            "description": "Updated Description",
            "course_id": "2"
        }
        
        # 首先模拟 get_resource_by_id 返回一个由当前用户创建的资源
        original_resource = ResourceFactory(
            id=resource_id,
            created_by=mock_normal_user.id,  # 确保资源是由当前用户创建的
            status=ResourceStatus.PENDING    # 确保资源状态是 PENDING
        )
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=original_resource)
        
        # set mock return value for update_resource
        updated_resource = ResourceFactory(
            id=resource_id,
            title=form_data["title"],
            description=form_data["description"],
            course_id=form_data["course_id"],
            created_by=mock_normal_user.id,  # 保持与原始资源一致
            updated_by=mock_normal_user.id
        )
        
        # use AsyncMock
        mock_resource_service.update_resource = AsyncMock(return_value=updated_resource)
        
        response = test_client.patch(
                    f"{self.BASE_URL}/{resource_id}",
                    data=form_data
                )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == form_data["title"]
        assert response.json()["description"] == form_data["description"]
        assert response.json()["course_id"] == form_data["course_id"]

    @pytest.mark.asyncio
    async def test_review_resource_success(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
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
        
        response = test_client.post(
                    f"{self.BASE_URL}/{resource_id}/review",
                    json=review_data
                )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == ResourceStatus.APPROVED.value

    # error case test
    async def test_get_resource_not_found(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test get non-existent resource"""
        resource_id = 9999
        
        # set mock throw exception
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=NotFoundError(f"Resource with id {resource_id} not found")
        )
        

        response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_create_resource_invalid_file(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
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
        
        response = test_client.post(
                    f"{self.BASE_URL}/create",
                    files=files,
                    data=form_data
                )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # server error test
    async def test_get_resource_server_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test get resource server error"""
        resource_id = 1
        
        # set mock throw exception
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=Exception("Database connection error")
        )
        

        response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to get resource"

    async def test_get_resource_url(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test get resource download url"""
        resource_id = 1
        signed_url = "https://storage.googleapis.com/test-bucket/test-file.pdf?signature=abc123"
        
        # use AsyncMock
        mock_resource_service.get_resource_url = AsyncMock(return_value=signed_url)
        

        response = test_client.get(f"{self.BASE_URL}/{resource_id}/download")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == signed_url

    async def test_delete_resource_success(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """test delete resource"""
        resource_id = 1
        
        # use AsyncMock
        mock_resource_service.delete_resource = AsyncMock(return_value=True)
        

        response = test_client.delete(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Resource deleted successfully"

    async def test_rate_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test rate resource"""
        resource_id = 1
        
        rating_data = {
            "rating": 4.5
        }
        
        # mock rating response
        rating_response = {
            "resource_id": resource_id,
            "user_id": mock_normal_user.id,
            "rating": rating_data["rating"],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
        
        # use AsyncMock
        mock_resource_service.rate_resource = AsyncMock(return_value=rating_response)
        
        response = test_client.post(
                            f"{self.BASE_URL}/{resource_id}/rating",
                            json=rating_data
                        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["rating"] == rating_data["rating"]
        assert response.json()["resource_id"] == resource_id
        assert response.json()["user_id"] == mock_normal_user.id

    async def test_get_user_rating_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test get user rating for resource"""
        resource_id = 1
        
        # mock rating response
        rating_response = {
            "resource_id": resource_id,
            "user_id": mock_normal_user.id,
            "rating": 4.5,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }
        
        # use AsyncMock
        mock_resource_service.get_user_rating = AsyncMock(return_value=rating_response)
        

        response = test_client.get(f"{self.BASE_URL}/{resource_id}/rating")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["rating"] == 4.5
        assert response.json()["resource_id"] == resource_id
        assert response.json()["user_id"] == mock_normal_user.id

    async def test_get_user_rating_not_found(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """test get non-existent user rating"""
        resource_id = 1
        
        # set mock throw exception
        mock_resource_service.get_user_rating = AsyncMock(
            side_effect=NotFoundError(f"Rating for resource {resource_id} not found")
        )
        
        response = test_client.get(f"{self.BASE_URL}/{resource_id}/rating")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_deactivate_resource_success(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """test deactivate resource (admin only)"""
        resource_id = 1
        
        # mock deactivated resource
        deactivated_resource = ResourceFactory(
            id=resource_id,
            status=ResourceStatus.INACTIVE,
            updated_by=mock_admin_user.id
        )
        
        # use AsyncMock
        mock_resource_service.deactivate_resource = AsyncMock(return_value=deactivated_resource)
        

        response = test_client.post(f"{self.BASE_URL}/{resource_id}/deactivate")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == ResourceStatus.INACTIVE.value

    async def test_reactivate_resource_success(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """test reactivate resource (admin only)"""
        resource_id = 1
        
        # mock reactivated resource
        reactivated_resource = ResourceFactory(
            id=resource_id,
            status=ResourceStatus.APPROVED,
            updated_by=mock_admin_user.id
        )
        
        # use AsyncMock
        mock_resource_service.reactivate_resource = AsyncMock(return_value=reactivated_resource)
        response = test_client.post(f"{self.BASE_URL}/{resource_id}/reactivate")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == ResourceStatus.APPROVED.value 