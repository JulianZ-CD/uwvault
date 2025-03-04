import pytest
from pathlib import Path
from fastapi import status

from api.core.config import get_settings, Settings
from api.core.storage import storage_manager
from api.tests.factories import FileFactory
from api.tests.conftest import get_auth_headers
from api.utils.logger import setup_logger

# setup test logger
test_logger = setup_logger("test_reso_api", "test_reso_api.log")

# Constants
RESOURCES_PATH = "/api/py/resources"
TEST_TABLE_NAME = 'resources'

# Test file paths
TEST_FILES_DIR = Path(__file__).parent / "test_files"
TEST_FILE_PATH = TEST_FILES_DIR / "test_document.pdf"

# Test user credentials
TEST_USER = {
    "email": str,
    "password": str
}

@pytest.fixture(scope="function", autouse=True)
async def setup_test_env(test_db, resource_service):
    """Set up test environment for each test"""
    try:
        await storage_manager._ensure_initialized()
        await FileFactory.cleanup_test_files()
        yield
    except Exception as e:
        raise

# Test cases
@pytest.mark.e2e
def test_resource_lifecycle(test_client, test_db):
    """Test complete resource lifecycle including creation, review, verification, update and various operations"""
    resource_id = None
    
    try:
        headers = get_auth_headers(test_db)
        
        # 1. Create resource
        test_file = FileFactory.generate_test_file()
        resource_data = {
            "title": "Lifecycle Test Resource",
            "description": "Test for complete resource lifecycle",
            "course_id": "ece 657",
            "original_filename": test_file["filename"],
            "uploader_id": "1"
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

        # 2. Verify storage sync status
        get_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}",
            headers=headers
        )
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["storage_status"] == "synced"

        # 3. Test basic update
        update_data = {
            "title": "Updated Resource Title",
            "description": "Updated description",
            "course_id": "ece 658"
        }
        
        update_response = test_client.patch(
            f"{RESOURCES_PATH}/{resource_id}",
            data=update_data,
            headers=headers
        )
        
        assert update_response.status_code == status.HTTP_200_OK
        updated_resource = update_response.json()
        assert updated_resource["title"] == update_data["title"]
        assert updated_resource["description"] == update_data["description"]
        assert updated_resource["course_id"] == update_data["course_id"]

        # 4. Review resource
        review_data = {
            "status": "approved",
            "review_comment": "Approved for testing",
            "reviewed_by": 1,
            "is_admin": True
        }
        review_response = test_client.post(
            f"{RESOURCES_PATH}/{resource_id}/review",
            json=review_data,
            headers=headers
        )
        assert review_response.status_code == status.HTTP_200_OK

        # 5. Test deactivate
        deactivate_response = test_client.post(
            f"{RESOURCES_PATH}/{resource_id}/deactivate",
            headers=headers
        )
        assert deactivate_response.status_code == status.HTTP_200_OK
        assert deactivate_response.json()["status"] == "inactive"
        assert not deactivate_response.json()["is_active"]

        # 6. Test reactivate
        reactivate_response = test_client.post(
            f"{RESOURCES_PATH}/{resource_id}/reactivate",
            headers=headers
        )
        assert reactivate_response.status_code == status.HTTP_200_OK
        assert reactivate_response.json()["status"] == "approved"
        assert reactivate_response.json()["is_active"]

        # 7. Get resource details
        get_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}?include_pending=true&is_admin=true",
            headers=headers
        )
        assert get_response.status_code == status.HTTP_200_OK
        
        resource_data = get_response.json()
        assert resource_data["title"] == "Updated Resource Title"
        assert resource_data["description"] == "Updated description"
        assert resource_data["status"] == "approved"
        assert resource_data["storage_status"] == "synced"

        # 8. Get download URL
        url_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}/download",
            headers=headers
        )
        assert url_response.status_code == status.HTTP_200_OK
        download_url = url_response.json()
        assert isinstance(download_url, str)
        assert download_url.startswith("https://")

        # 9. List resources and verify the created resource is included
        list_response = test_client.get(
            f"{RESOURCES_PATH}/",
            headers=headers
        )
        assert list_response.status_code == status.HTTP_200_OK
        response_data = list_response.json()
        
        assert "items" in response_data
        assert "total" in response_data
        resources = response_data["items"]
        
        # Verify our resource is in the list
        found = False
        for resource in resources:
            if resource["id"] == resource_id:
                found = True
                break
        assert found, "Created resource not found in list"

        # 10. Test direct file download
        download_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}/download-file",
            headers=headers
        )
        assert download_response.status_code == status.HTTP_200_OK
        assert "Content-Disposition" in download_response.headers
        
        # 11. Test resource deletion (as the last step of the lifecycle)
        delete_response = test_client.delete(
            f"{RESOURCES_PATH}/{resource_id}",
            headers=headers
        )
        assert delete_response.status_code == status.HTTP_200_OK
        assert delete_response.json()["message"] == "Resource deleted successfully"

        # verify resource is actually deleted
        get_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}",
            headers=headers
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    except Exception as e:
        test_logger.error(f"Test failed: {str(e)}")
        raise

@pytest.mark.e2e
def test_resource_error_handling(test_client, test_db):
    """Test error handling for resource operations"""
    resource_id = None
    try:
        headers = get_auth_headers(test_db)
        
        # 1. Test invalid resource ID (NotFoundError)
        get_response = test_client.get(f"{RESOURCES_PATH}/99999", headers=headers)
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

        # 2. Test invalid file type (ValidationError)
        invalid_file = FileFactory.generate_invalid_file()
        resource_data = {
            "title": "Invalid Resource",
            "description": "Invalid File Type Test",
            "course_id": "ece 657"
        }
        create_response = test_client.post(
            f"{RESOURCES_PATH}/create",
            files={"file": ("test.txt", invalid_file["content"], "text/plain")},
            data=resource_data,
            headers=headers
        )
        assert create_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # 3. Create a valid resource for subsequent tests
        test_file = FileFactory.generate_test_file()
        resource_data = {
            "title": "Storage Error Test",
            "description": "Test for storage errors",
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

        # 4. Test invalid update (ValidationError)
        update_response = test_client.patch(
            f"{RESOURCES_PATH}/{resource_id}",
            data={
                "title": "",  # Empty title should be invalid
                "description": "Invalid update test",
                "course_id": "ece 657"
            },
            headers={
                **headers,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        assert update_response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # 5. Test invalid review status
        invalid_review = {
            "status": "invalid_status",
            "review_comment": "Invalid review test",
            "reviewed_by": "1"
        }
        review_response = test_client.post(
            f"{RESOURCES_PATH}/{resource_id}/review",
            json=invalid_review,
            headers=headers
        )
        assert review_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # 6. Test download non-existent file
        download_response = test_client.get(
            f"{RESOURCES_PATH}/99999/download-file",
            headers=headers
        )
        assert download_response.status_code == status.HTTP_404_NOT_FOUND

    finally:
        if resource_id:
            try:
                test_client.delete(
                    f"{RESOURCES_PATH}/{resource_id}",
                    headers=headers
                )
            except Exception as e:
                test_logger.error(f"Error cleaning up test resource: {str(e)}")