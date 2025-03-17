import pytest
from pathlib import Path
from fastapi import status
import io

from api.core.config import get_settings
from api.tests.factories import FileFactory
from api.utils.logger import setup_logger
from api.services.resource_service import ResourceService
from api.models.resource import ResourceStatus

# setup test logger
test_logger = setup_logger("test_reso_api", "test_reso_api.log")

# Constants
RESOURCES_PATH = "/api/py/resources"
TEST_TABLE_NAME = 'resources'

# Test file paths
TEST_FILES_DIR = Path(__file__).parent / "test_files"
TEST_FILE_PATH = TEST_FILES_DIR / "test_document.pdf"

@pytest.fixture(scope="function", autouse=True)
async def setup_test_env(test_db, resource_service):
    """Set up test environment for each test"""
    try:
        await resource_service._ensure_storage_initialized()
        await FileFactory.cleanup_test_files(resource_service)
        yield
    except Exception as e:
        test_logger.error(f"Error in setup: {str(e)}")
        raise

class BaseResourceTest:
    """基础资源测试类"""
    def setup_method(self):
        """每个测试方法前的设置"""
        self.created_resources = []

    @pytest.fixture(autouse=True)
    async def cleanup(self, test_client, admin_user_headers):
        """每个测试后自动清理资源"""
        yield
        # 使用管理员权限清理资源
        headers, _ = admin_user_headers
        for resource_id in self.created_resources:
            try:
                test_client.delete(
                    f"{RESOURCES_PATH}/{resource_id}",
                    headers=headers
                )
            except Exception as e:
                test_logger.error(f"Error cleaning up resource {resource_id}: {str(e)}")

@pytest.mark.e2e
class TestResourceAPI(BaseResourceTest):
    """基础资源API测试"""
    
    async def test_invalid_file_type(self, test_client, regular_user_headers):
        """测试上传无效文件类型"""
        try:
            headers, user_id = regular_user_headers
            
            # 创建无效文件类型
            invalid_file = FileFactory.generate_invalid_file()
            
            files = {
                "file": (
                    invalid_file["filename"],
                    invalid_file["content"],
                    invalid_file["content_type"]
                )
            }
            
            form_data = {
                "title": "Invalid File Type Test",
                "description": "Testing invalid file type rejection",
                "course_id": "ece 651",
                "user_id": user_id
            }
            
            response = test_client.post(
                f"{RESOURCES_PATH}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise

@pytest.mark.e2e
class TestRegularUserResourceAPI(BaseResourceTest):
    """普通用户资源API测试"""
    
    async def test_regular_user_resource_lifecycle(self, test_client, regular_user_headers):
        """测试普通用户资源生命周期"""
        try:
            headers, user_id = regular_user_headers
            
            # 1. 创建资源
            test_file = FileFactory.generate_test_file()
            form_data = {
                "title": "Regular User Resource",
                "description": "Test resource created by regular user",
                "course_id": "ece 657",
                "user_id": user_id
            }
            
            files = {
                "file": (
                    test_file["filename"],
                    test_file["content"],
                    test_file["content_type"]
                )
            }
            
            create_response = test_client.post(
                f"{RESOURCES_PATH}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            self.created_resources.append(resource_id)
            
            # 验证资源状态为 PENDING
            get_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_200_OK
            assert get_response.json()["status"] == ResourceStatus.PENDING.value
            
            # 2. 更新资源
            update_data = {
                "title": "Updated Regular User Resource",
                "description": "Updated description"
            }
            
            update_response = test_client.patch(
                f"{RESOURCES_PATH}/{resource_id}",
                data=update_data,
                headers=headers
            )
            
            assert update_response.status_code == status.HTTP_200_OK
            assert update_response.json()["title"] == update_data["title"]
            
            # 3. 获取资源列表（应该看不到PENDING状态的资源）
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=headers
            )
            assert list_response.status_code == status.HTTP_200_OK
            resources = list_response.json()["items"]
            assert not any(r["id"] == resource_id for r in resources)
            
            # 4. 获取下载URL
            url_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}/download",
                headers=headers
            )
            assert url_response.status_code == status.HTTP_200_OK
            assert isinstance(url_response.json(), str)
            
            # 5. 下载资源
            download_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}/download-file",
                headers=headers
            )
            assert download_response.status_code == status.HTTP_200_OK
            assert "Content-Disposition" in download_response.headers
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise

@pytest.mark.e2e
class TestAdminResourceAPI(BaseResourceTest):
    """管理员资源API测试"""
    
    async def test_admin_resource_lifecycle(self, test_client, admin_user_headers):
        """测试管理员资源生命周期"""
        try:
            headers, user_id = admin_user_headers
            
            # 1. 创建资源
            test_file = FileFactory.generate_test_file()
            form_data = {
                "title": "Admin Resource",
                "description": "Test resource created by admin",
                "course_id": "ece 657",
                "user_id": user_id
            }
            
            files = {
                "file": (
                    test_file["filename"],
                    test_file["content"],
                    test_file["content_type"]
                )
            }
            
            create_response = test_client.post(
                f"{RESOURCES_PATH}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            self.created_resources.append(resource_id)
            
            # 验证资源状态为 APPROVED（管理员上传的资源直接批准）
            get_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_200_OK
            assert get_response.json()["status"] == ResourceStatus.APPROVED.value
            
            # 2. 更新资源
            update_data = {
                "title": "Updated Admin Resource",
                "description": "Updated by admin"
            }
            
            update_response = test_client.patch(
                f"{RESOURCES_PATH}/{resource_id}",
                data=update_data,
                headers=headers
            )
            
            assert update_response.status_code == status.HTTP_200_OK
            assert update_response.json()["title"] == update_data["title"]
            
            # 3. 获取资源列表（应该能看到所有状态的资源）
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=headers
            )
            assert list_response.status_code == status.HTTP_200_OK
            resources = list_response.json()["items"]
            assert any(r["id"] == resource_id for r in resources)
            
            # 4. 停用资源
            deactivate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/deactivate",
                headers=headers
            )
            assert deactivate_response.status_code == status.HTTP_200_OK
            assert deactivate_response.json()["status"] == ResourceStatus.INACTIVE.value
            assert not deactivate_response.json()["is_active"]
            
            # 5. 重新激活资源
            activate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/reactivate",
                headers=headers
            )
            assert activate_response.status_code == status.HTTP_200_OK
            assert activate_response.json()["status"] == ResourceStatus.APPROVED.value
            assert activate_response.json()["is_active"]
            
            # 6. 删除资源
            delete_response = test_client.delete(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert delete_response.status_code == status.HTTP_200_OK
            
            # 验证资源已被删除
            get_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_404_NOT_FOUND
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise

@pytest.mark.e2e
class TestResourceErrorHandling(BaseResourceTest):
    """资源错误处理测试"""
    
    async def test_resource_validation_errors(self, test_client, regular_user_headers):
        """测试资源验证错误"""
        try:
            headers, user_id = regular_user_headers
            
            # 1. 测试无效的资源ID
            get_response = test_client.get(
                f"{RESOURCES_PATH}/99999",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_404_NOT_FOUND
            
            # 2. 测试无效的文件类型
            invalid_file = FileFactory.generate_invalid_file()
            resource_data = {
                "title": "Invalid Resource",
                "description": "Invalid File Type Test",
                "course_id": "ece 657"
            }
            
            files = {
                "file": (
                    "test.txt",
                    invalid_file["content"],
                    "text/plain"
                )
            }
            
            create_response = test_client.post(
                f"{RESOURCES_PATH}/create",
                files=files,
                data=resource_data,
                headers=headers
            )
            assert create_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
            # 3. 测试无效的更新数据
            # 首先创建一个有效资源
            test_file = FileFactory.generate_test_file()
            valid_resource_data = {
                "title": "Valid Resource",
                "description": "Test for invalid update",
                "course_id": "ece 657"
            }
            
            files = {
                "file": (
                    test_file["filename"],
                    test_file["content"],
                    test_file["content_type"]
                )
            }
            
            create_response = test_client.post(
                f"{RESOURCES_PATH}/create",
                files=files,
                data=valid_resource_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            self.created_resources.append(resource_id)
            
            # 尝试无效更新
            invalid_update = {
                "title": "",  # 空标题应该无效
                "description": "Invalid update test"
            }
            
            update_response = test_client.patch(
                f"{RESOURCES_PATH}/{resource_id}",
                data=invalid_update,
                headers=headers
            )
            assert update_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise

    async def test_permission_errors(self, test_client, regular_user_headers):
        """测试权限错误"""
        try:
            headers, user_id = regular_user_headers
            
            # 1. 创建资源（使用普通用户）
            test_file = FileFactory.generate_test_file()
            resource_data = {
                "title": "Permission Test Resource",
                "description": "Test for permission errors",
                "course_id": "ece 657"
            }
            
            files = {
                "file": (
                    test_file["filename"],
                    test_file["content"],
                    test_file["content_type"]
                )
            }
            
            create_response = test_client.post(
                f"{RESOURCES_PATH}/create",
                files=files,
                data=resource_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            self.created_resources.append(resource_id)
            
            # 2. 测试普通用户尝试审核资源
            review_data = {
                "status": ResourceStatus.APPROVED.value,
                "review_comment": "Attempting to approve",
                "reviewed_by": "1"
            }
            
            review_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/review",
                json=review_data,
                headers=headers
            )
            assert review_response.status_code == status.HTTP_403_FORBIDDEN
            
            # 3. 测试普通用户尝试删除资源
            delete_response = test_client.delete(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert delete_response.status_code == status.HTTP_403_FORBIDDEN
            
            # 4. 测试普通用户尝试停用/启用资源
            deactivate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/deactivate",
                headers=headers
            )
            assert deactivate_response.status_code == status.HTTP_403_FORBIDDEN
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise

@pytest.mark.e2e
class TestResourceRatingAPI(BaseResourceTest):
    """资源评分API测试"""
    
    async def test_resource_rating_operations(self, test_client, regular_user_headers, admin_user_headers):
        """测试资源评分操作"""
        try:
            admin_headers, admin_id = admin_user_headers
            user_headers, user_id = regular_user_headers
            
            # 1. 获取已有的资源列表
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=admin_headers
            )
            assert list_response.status_code == status.HTTP_200_OK
            
            resources = list_response.json()["items"]
            assert len(resources) > 0, "need at least one existing resource for testing"
            
            # 选择第一个已批准的资源进行评分
            approved_resources = [r for r in resources if r["status"] == ResourceStatus.APPROVED.value]
            assert len(approved_resources) > 0, "need at least one approved resource for testing"
            
            resource_id = approved_resources[0]["id"]
            
            # 2. 用户对资源进行评分
            rating_data = {"rating": 4.5}
            rate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json=rating_data,
                headers=user_headers
            )
            
            assert rate_response.status_code == status.HTTP_200_OK
            rating_result = rate_response.json()
            
            # 修改这里：检查user_rating字段而不是rating字段
            assert "user_rating" in rating_result
            assert rating_result["user_rating"] == 4.5
            assert "average_rating" in rating_result
            assert "rating_count" in rating_result
            
            # 3. 获取用户评分
            get_rating_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                headers=user_headers
            )
            
            assert get_rating_response.status_code == status.HTTP_200_OK
            user_rating = get_rating_response.json()
            
            # 这里也需要修改：检查user_rating字段
            assert "user_rating" in user_rating
            assert user_rating["user_rating"] == 4.5
            
            # 4. 更新用户评分
            update_rating = {"rating": 3.5}
            update_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json=update_rating,
                headers=user_headers
            )
            
            assert update_response.status_code == status.HTTP_200_OK
            updated_rating = update_response.json()
            
            # 这里也需要修改：检查user_rating字段
            assert "user_rating" in updated_rating
            assert updated_rating["user_rating"] == 3.5
            
            # 5. 验证资源详情中包含评分信息
            get_resource_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=user_headers
            )
            
            assert get_resource_response.status_code == status.HTTP_200_OK
            resource_data = get_resource_response.json()
            assert "average_rating" in resource_data
            assert "rating_count" in resource_data
            assert resource_data["rating_count"] >= 1
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise
    
    async def test_rating_validation(self, test_client, regular_user_headers, admin_user_headers):
        """测试评分验证"""
        try:
            user_headers, user_id = regular_user_headers
            
            # 1. 获取已有的资源列表
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=admin_user_headers[0]  # 使用管理员权限获取所有资源
            )
            
            resources = list_response.json()["items"]
            assert len(resources) > 0, "need at least one existing resource for testing"
            
            # 选择第一个已批准的资源进行评分
            approved_resources = [r for r in resources if r["status"] == ResourceStatus.APPROVED.value]
            assert len(approved_resources) > 0, "need at least one approved resource for testing"
            
            resource_id = approved_resources[0]["id"]
            
            # 2. 测试无效评分值 - 低于最小值
            invalid_low_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 0.5},  # 低于最小值1.0
                headers=user_headers
            )
            
            assert invalid_low_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
            # 3. 测试无效评分值 - 高于最大值
            invalid_high_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 5.5},  # 高于最大值5.0
                headers=user_headers
            )
            
            assert invalid_high_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
            # 4. 测试对不存在的资源进行评分
            nonexistent_response = test_client.post(
                f"{RESOURCES_PATH}/99999/rating",
                json={"rating": 4.0},
                headers=user_headers
            )
            
            assert nonexistent_response.status_code == status.HTTP_404_NOT_FOUND
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise
    
    async def test_multiple_user_ratings(self, test_client, regular_user_headers, admin_user_headers):
        """测试多用户评分"""
        try:
            admin_headers, admin_id = admin_user_headers
            user_headers, user_id = regular_user_headers
            
            # 1. 获取已有的资源列表
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=admin_headers
            )
            
            resources = list_response.json()["items"]
            assert len(resources) > 0, "need at least one existing resource for testing"
            
            # 选择第一个已批准的资源进行评分
            approved_resources = [r for r in resources if r["status"] == ResourceStatus.APPROVED.value]
            assert len(approved_resources) > 0, "need at least one approved resource for testing"
            
            resource_id = approved_resources[0]["id"]
            
            # 2. 管理员用户评分
            admin_rate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 5.0},
                headers=admin_headers
            )
            
            assert admin_rate_response.status_code == status.HTTP_200_OK
            
            # 3. 普通用户评分
            user_rate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 4.0},
                headers=user_headers
            )
            
            assert user_rate_response.status_code == status.HTTP_200_OK
            
            # 4. 验证资源评分统计
            get_resource_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=user_headers
            )
            
            assert get_resource_response.status_code == status.HTTP_200_OK
            resource_data = get_resource_response.json()
            
            # 验证评分计数和平均分
            assert resource_data["rating_count"] >= 2
            # 不能精确断言平均分，因为可能有其他用户也对此资源进行了评分
            assert "average_rating" in resource_data
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise
