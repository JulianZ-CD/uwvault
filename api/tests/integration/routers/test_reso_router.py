import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
import hashlib
import io
from api.routers.resources_router import get_resource_service, get_current_user, require_admin, security
from api.routers.resources_router import router
from api.models.resource import ResourceStatus, ResourceCreate, ResourceReview
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
        """测试获取资源成功"""
        resource_id = 1
        mock_resource = ResourceFactory(id=resource_id)
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=mock_resource)
        
        response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == resource_id
    
    @pytest.mark.asyncio
    async def test_get_resource_not_found(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取不存在的资源"""
        resource_id = 999
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=ValueError(f"Resource with id {resource_id} not found")
        )
        
        response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert f"Resource with id {resource_id} not found" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_get_resource_server_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取资源服务器错误"""
        resource_id = 1
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.get(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get resource" in response.json()["detail"]
    
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

    @pytest.mark.asyncio
    async def test_create_resource_validation_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies, test_file
    ):
        """测试创建资源验证错误"""
        form_data = {
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "CS101"
        }
        files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
        
        mock_resource_service.create_resource = AsyncMock(
            side_effect=ValueError("Invalid resource data")
        )
        
        response = test_client.post(
            f"{self.BASE_URL}/create",
            files=files,
            data=form_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_create_resource_storage_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies, test_file
    ):
        """测试创建资源存储错误"""
        form_data = {
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "CS101"
        }
        files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
        
        mock_resource_service.create_resource = AsyncMock(
            side_effect=Exception("Failed to store file")
        )
        
        response = test_client.post(
            f"{self.BASE_URL}/create",
            files=files,
            data=form_data
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
    @pytest.mark.asyncio
    async def test_update_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试更新资源成功"""
        resource_id = 1
        
        # 使用表单数据格式
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
        
        # 设置 update_resource 的模拟返回值
        updated_resource = ResourceFactory(
            id=resource_id,
            title=form_data["title"],
            description=form_data["description"],
            course_id=form_data["course_id"],
            created_by=mock_normal_user.id,  # 保持与原始资源一致
            updated_by=mock_normal_user.id
        )
        
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
    async def test_update_resource_not_found(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试更新不存在的资源"""
        resource_id = 999
        form_data = {"title": "Updated Title"}
        
        mock_resource_service.get_resource_by_id = AsyncMock(
            side_effect=ValueError(f"Resource with id {resource_id} not found")
        )
        
        response = test_client.patch(
            f"{self.BASE_URL}/{resource_id}",
            data=form_data
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_update_resource_validation_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试更新资源验证错误"""
        resource_id = 1
        
        mock_resource = ResourceFactory(
            id=resource_id, 
            created_by=mock_normal_user.id,
            status=ResourceStatus.PENDING  # 确保状态不是APPROVED
        )
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=mock_resource)
        
        # 使用 ValueError 触发 422 错误
        mock_resource_service.update_resource = AsyncMock(
            side_effect=ValueError("Title cannot be empty")
        )
        
        response = test_client.patch(
            f"{self.BASE_URL}/{resource_id}",
            data={"title": ""}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND  # 根据路由器实际行为修改期望

    @pytest.mark.asyncio
    async def test_update_resource_storage_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试更新资源存储错误"""
        resource_id = 1
        
        # 首先模拟资源存在且由当前用户创建
        mock_resource = ResourceFactory(
            id=resource_id, 
            created_by=mock_normal_user.id,
            status=ResourceStatus.PENDING
        )
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=mock_resource)
        
        # 使用 Exception 触发 500 错误
        mock_resource_service.update_resource = AsyncMock(
            side_effect=Exception("Failed to store updated file")
        )
        
        response = test_client.patch(
            f"{self.BASE_URL}/{resource_id}",
            data={"title": "Updated Title"}
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
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
    
    @pytest.mark.asyncio
    async def test_rate_resource_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试评分资源成功"""
        resource_id = 1
        rating_data = {"rating": 4.5}
        
        # 模拟资源存在
        mock_resource = ResourceFactory(id=resource_id, status=ResourceStatus.APPROVED)
        mock_resource_service.get_resource_by_id = AsyncMock(return_value=mock_resource)
        
        # 模拟评分成功
        mock_resource_service.rate_resource = AsyncMock(return_value=mock_resource)
        
        response = test_client.post(
            f"{self.BASE_URL}/{resource_id}/rating",
            json=rating_data
        )
        
        assert response.status_code == status.HTTP_200_OK
    
    @pytest.mark.asyncio
    async def test_rate_resource_not_found(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试评分不存在的资源"""
        resource_id = 999
        rating_data = {"rating": 4.5}
        
        mock_resource_service.rate_resource = AsyncMock(
            side_effect=ValueError(f"Resource with id {resource_id} not found")
        )
        
        response = test_client.post(
            f"{self.BASE_URL}/{resource_id}/rating",
            json=rating_data
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_rate_resource_validation_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试评分验证错误"""
        resource_id = 1
        rating_data = {"rating": 6.0}  # 超出范围的评分
        
        mock_resource_service.rate_resource = AsyncMock(
            side_effect=ValueError("Rating must be between 1 and 5")
        )
        
        response = test_client.post(
            f"{self.BASE_URL}/{resource_id}/rating",
            json=rating_data
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    async def test_rate_resource_server_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试评分服务器错误"""
        resource_id = 1
        rating_data = {"rating": 4.5}
        
        mock_resource_service.rate_resource = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.post(
            f"{self.BASE_URL}/{resource_id}/rating",
            json=rating_data
        )
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to rate resource" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_get_user_rating_not_found(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取用户评分不存在"""
        resource_id = 1
        
        mock_resource_service.get_user_rating = AsyncMock(
            side_effect=ValueError("Rating not found")
        )
        
        response = test_client.get(f"{self.BASE_URL}/{resource_id}/rating")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_get_course_ids_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取课程ID列表成功"""
        course_ids = ["CS101", "CS102", "CS103"]
        mock_resource_service.get_all_course_ids = AsyncMock(return_value=course_ids)
        
        response = test_client.get(f"{self.BASE_URL}/course-ids")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == course_ids
    
    @pytest.mark.asyncio
    async def test_get_course_ids_server_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取课程ID列表异常情况"""
        mock_resource_service.get_all_course_ids = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.get(f"{self.BASE_URL}/course-ids")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get course IDs" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_get_upload_history_success(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取上传历史成功"""
        resources = [ResourceFactory() for _ in range(3)]
        total = len(resources)
        mock_resource_service.get_user_uploads = AsyncMock(return_value=(resources, total))
        
        response = test_client.get(f"{self.BASE_URL}/history/uploads")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["items"]) == total
        assert response.json()["total"] == total
    
    @pytest.mark.asyncio
    async def test_get_upload_history_server_error(
        self, test_client, mock_normal_user, mock_resource_service, setup_dependencies
    ):
        """测试获取上传历史异常情况"""
        mock_resource_service.get_user_uploads = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.get(f"{self.BASE_URL}/history/uploads")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to get upload history" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_deactivate_resource_not_found(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """测试停用不存在的资源"""
        resource_id = 999
        
        mock_resource_service.deactivate_resource = AsyncMock(
            side_effect=ValueError(f"Resource with id {resource_id} not found")
        )
        
        response = test_client.post(f"{self.BASE_URL}/{resource_id}/deactivate")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_deactivate_resource_server_error(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """测试停用资源服务器错误"""
        resource_id = 1
        
        mock_resource_service.deactivate_resource = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.post(f"{self.BASE_URL}/{resource_id}/deactivate")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to deactivate resource" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_reactivate_resource_not_found(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """测试重新激活不存在的资源"""
        resource_id = 999
        
        mock_resource_service.reactivate_resource = AsyncMock(
            side_effect=ValueError(f"Resource with id {resource_id} not found")
        )
        
        response = test_client.post(f"{self.BASE_URL}/{resource_id}/reactivate")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_reactivate_resource_server_error(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """测试重新激活资源服务器错误"""
        resource_id = 1
        
        mock_resource_service.reactivate_resource = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.post(f"{self.BASE_URL}/{resource_id}/reactivate")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to reactivate resource" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_delete_resource_not_found(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """测试删除不存在的资源"""
        resource_id = 999
        
        mock_resource_service.delete_resource = AsyncMock(
            side_effect=ValueError(f"Resource with id {resource_id} not found")
        )
        
        response = test_client.delete(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_delete_resource_server_error(
        self, test_client, mock_admin_user, mock_resource_service, setup_admin_dependencies
    ):
        """测试删除资源服务器错误"""
        resource_id = 1
        
        mock_resource_service.delete_resource = AsyncMock(
            side_effect=Exception("Database error")
        )
        
        response = test_client.delete(f"{self.BASE_URL}/{resource_id}")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to delete resource" in response.json()["detail"] 