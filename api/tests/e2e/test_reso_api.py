import pytest
from fastapi import status
from api.routers.resources_router import router
from api.tests.factories import FileFactory
from api.utils.logger import setup_logger
from api.models.resource import ResourceStatus

# setup test logger
test_logger = setup_logger("test_reso_api", "test_reso_api.log")

RESOURCES_PATH = router.prefix
TEST_FILES_DIR = FileFactory.TEST_FILES_DIR
TEST_FILE_PATH = FileFactory.TEST_FILE_PATH

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
    """basic resource test class"""
    def setup_method(self):
        """setup for each test method"""
        self.created_resources = []

    @pytest.fixture(autouse=True)
    async def cleanup(self, test_client, admin_user_headers):
        """cleanup resources after each test"""
        yield
        # use admin permission to cleanup resources
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
    """basic resource API test"""
    
    async def test_invalid_file_type(self, test_client, regular_user_headers):
        """test uploading invalid file type"""
        try:
            headers, user_id = regular_user_headers
            
            # create invalid file type
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
    """regular user resource API test"""
    
    async def test_regular_user_resource_lifecycle(self, test_client, regular_user_headers):
        """test regular user resource lifecycle"""
        try:
            headers, user_id = regular_user_headers
            
            # 1. create resource
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
            
            # verify resource status is PENDING
            get_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_200_OK
            assert get_response.json()["status"] == ResourceStatus.PENDING.value
            
            # 2. update resource (including file)
            new_test_file = FileFactory.generate_test_file()
            new_test_file["filename"] = "updated_file.pdf"  # use different file name
            
            update_data = {
                "title": "Updated Regular User Resource",
                "description": "Updated description"
            }
            
            update_files = {
                "file": (
                    new_test_file["filename"],
                    new_test_file["content"],
                    new_test_file["content_type"]
                )
            }
            
            update_response = test_client.patch(
                f"{RESOURCES_PATH}/{resource_id}",
                files=update_files,
                data=update_data,
                headers=headers
            )
            
            assert update_response.status_code == status.HTTP_200_OK
            assert update_response.json()["title"] == update_data["title"]
            assert update_response.json()["original_filename"] == new_test_file["filename"]
            
            # 3. get resource list (should not see PENDING status resource)
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=headers
            )
            assert list_response.status_code == status.HTTP_200_OK
            resources = list_response.json()["items"]
            assert not any(r["id"] == resource_id for r in resources)
            
            # 4. get download URL
            url_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}/download",
                headers=headers
            )
            assert url_response.status_code == status.HTTP_200_OK
            assert isinstance(url_response.json(), str)
            
            # 5. download resource
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
    """admin resource API test"""
    
    async def test_admin_resource_lifecycle(self, test_client, admin_user_headers):
        """test admin resource lifecycle"""
        try:
            headers, user_id = admin_user_headers
            
            # 1. create resource
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
            
            # verify resource status is APPROVED (admin uploaded resource is directly approved)
            get_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_200_OK
            assert get_response.json()["status"] == ResourceStatus.APPROVED.value
            
            # 2. update resource (including file)
            new_test_file = FileFactory.generate_test_file()
            new_test_file["filename"] = "admin_updated_file.pdf"
            
            update_data = {
                "title": "Updated Admin Resource",
                "description": "Updated by admin"
            }
            
            update_files = {
                "file": (
                    new_test_file["filename"],
                    new_test_file["content"],
                    new_test_file["content_type"]
                )
            }
            
            update_response = test_client.patch(
                f"{RESOURCES_PATH}/{resource_id}",
                files=update_files,
                data=update_data,
                headers=headers
            )
            
            assert update_response.status_code == status.HTTP_200_OK
            assert update_response.json()["title"] == update_data["title"]
            assert update_response.json()["original_filename"] == new_test_file["filename"]
            
            # 3. get resource list
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=headers
            )
            assert list_response.status_code == status.HTTP_200_OK
            resources = list_response.json()["items"]
            assert any(r["id"] == resource_id for r in resources)
            
            # 4. deactivate resource
            deactivate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/deactivate",
                headers=headers
            )
            assert deactivate_response.status_code == status.HTTP_200_OK
            assert deactivate_response.json()["status"] == ResourceStatus.INACTIVE.value
            assert not deactivate_response.json()["is_active"]
            
            # 5. reactivate resource
            activate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/reactivate",
                headers=headers
            )
            assert activate_response.status_code == status.HTTP_200_OK
            assert activate_response.json()["status"] == ResourceStatus.APPROVED.value
            assert activate_response.json()["is_active"]
            
            # 6. delete resource
            delete_response = test_client.delete(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert delete_response.status_code == status.HTTP_200_OK
            
            # verify resource is deleted
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
    """resource error handling test"""
    
    async def test_resource_validation_errors(self, test_client, regular_user_headers):
        """test resource validation errors"""
        try:
            headers, user_id = regular_user_headers
            
            # 1. test invalid resource ID
            get_response = test_client.get(
                f"{RESOURCES_PATH}/99999",
                headers=headers
            )
            assert get_response.status_code == status.HTTP_404_NOT_FOUND
            
            # 2. test invalid file type
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
            
            # 3. test invalid update data
            # first create a valid resource
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
            
            # try invalid update - use full space title
            invalid_update = {
                "title": "   ", 
                "description": "Invalid update test"
            }
            
            update_response = test_client.patch(
                f"{RESOURCES_PATH}/{resource_id}",
                data=invalid_update,
                headers=headers
            )
            assert update_response.status_code == status.HTTP_404_NOT_FOUND
            assert "Title cannot be empty" in update_response.json()["detail"]
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise

    async def test_permission_errors(self, test_client, regular_user_headers):
        """test permission errors"""
        try:
            headers, user_id = regular_user_headers
            
            # 1. create resource (use regular user)
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
            
            # 2. test regular user trying to review resource
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
            
            # 3. test regular user trying to delete resource
            delete_response = test_client.delete(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=headers
            )
            assert delete_response.status_code == status.HTTP_403_FORBIDDEN
            
            # 4. test regular user trying to deactivate/activate resource
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
    """resource rating API test"""
    
    async def test_resource_rating_operations(self, test_client, regular_user_headers, admin_user_headers):
        """test resource rating operations"""
        try:
            admin_headers, admin_id = admin_user_headers
            user_headers, user_id = regular_user_headers
            
            # 1. get existing resource list
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=admin_headers
            )
            assert list_response.status_code == status.HTTP_200_OK
            
            resources = list_response.json()["items"]
            assert len(resources) > 0, "need at least one existing resource for testing"
            
            # select the first approved resource for rating
            approved_resources = [r for r in resources if r["status"] == ResourceStatus.APPROVED.value]
            assert len(approved_resources) > 0, "need at least one approved resource for testing"
            
            resource_id = approved_resources[0]["id"]
            
            # 2. user rate resource
            rating_data = {"rating": 4.5}
            rate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json=rating_data,
                headers=user_headers
            )
            
            assert rate_response.status_code == status.HTTP_200_OK
            rating_result = rate_response.json()
            
            assert "user_rating" in rating_result
            assert rating_result["user_rating"] == 4.5
            assert "average_rating" in rating_result
            assert "rating_count" in rating_result
            
            # 3. get user rating
            get_rating_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                headers=user_headers
            )
            
            assert get_rating_response.status_code == status.HTTP_200_OK
            user_rating = get_rating_response.json()
            
            assert "user_rating" in user_rating
            assert user_rating["user_rating"] == 4.5
            
            # 4. update user rating
            update_rating = {"rating": 3.5}
            update_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json=update_rating,
                headers=user_headers
            )
            
            assert update_response.status_code == status.HTTP_200_OK
            updated_rating = update_response.json()
            
            assert "user_rating" in updated_rating
            assert updated_rating["user_rating"] == 3.5
            
            # 5. verify resource details include rating information
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
        """test rating validation"""
        try:
            user_headers, user_id = regular_user_headers
            
            # 1. get existing resource list
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=admin_user_headers[0]
            )
            
            resources = list_response.json()["items"]
            assert len(resources) > 0, "need at least one existing resource for testing"
            
            # select the first approved resource for rating
            approved_resources = [r for r in resources if r["status"] == ResourceStatus.APPROVED.value]
            assert len(approved_resources) > 0, "need at least one approved resource for testing"
            
            resource_id = approved_resources[0]["id"]
            
            # 2. test invalid rating value - below minimum
            invalid_low_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 0.5},
                headers=user_headers
            )
            
            assert invalid_low_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
            # 3. test invalid rating value - above maximum
            invalid_high_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 5.5},
                headers=user_headers
            )
            
            assert invalid_high_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
            # 4. test rating nonexistent resource
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
        """test multiple user ratings"""
        try:
            admin_headers, admin_id = admin_user_headers
            user_headers, user_id = regular_user_headers
            
            # 1. get existing resource list
            list_response = test_client.get(
                f"{RESOURCES_PATH}/",
                headers=admin_headers
            )
            
            resources = list_response.json()["items"]
            assert len(resources) > 0, "need at least one existing resource for testing"
            
            # select the first approved resource for rating
            approved_resources = [r for r in resources if r["status"] == ResourceStatus.APPROVED.value]
            assert len(approved_resources) > 0, "need at least one approved resource for testing"
            
            resource_id = approved_resources[0]["id"]
            
            # 2. admin user rate resource
            admin_rate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 5.0},
                headers=admin_headers
            )
            
            assert admin_rate_response.status_code == status.HTTP_200_OK
            
            # 3. regular user rate resource
            user_rate_response = test_client.post(
                f"{RESOURCES_PATH}/{resource_id}/rating",
                json={"rating": 4.0},
                headers=user_headers
            )
            
            assert user_rate_response.status_code == status.HTTP_200_OK
            
            # 4. verify resource rating statistics
            get_resource_response = test_client.get(
                f"{RESOURCES_PATH}/{resource_id}",
                headers=user_headers
            )
            
            assert get_resource_response.status_code == status.HTTP_200_OK
            resource_data = get_resource_response.json()
            
            assert resource_data["rating_count"] >= 2
            assert "average_rating" in resource_data
            
        except Exception as e:
            test_logger.error(f"Test failed: {str(e)}")
            raise
