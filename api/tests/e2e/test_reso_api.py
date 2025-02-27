import pytest
from pathlib import Path
from fastapi import status

from api.core.config import get_settings, Settings
from api.core.storage import storage_manager
from api.tests.factories import FileFactory
from api.tests.conftest import get_auth_headers

# Constants
RESOURCES_PATH = "/resources"  # 直接使用路由定义的路径
TEST_TABLE_NAME = 'resources'

# Test file paths
TEST_FILES_DIR = Path(__file__).parent / "test_files"
TEST_FILE_PATH = TEST_FILES_DIR / "test_document.pdf"

# Test user credentials
TEST_USER = {
    "email": "ziyuwangca123456@gmail.com",
    "password": "12345678"
}

def cleanup_resource(resource_id, test_client, test_db, headers):
    """Clean up resource after test"""
    if resource_id:
        try:
            test_client.delete(
                f"{RESOURCES_PATH}/{resource_id}?is_admin=true",
                headers=headers
            )
        except Exception:
            try:
                test_db.table('resources').delete().eq('id', resource_id).execute()
            except Exception:
                pass

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
    """Test complete resource lifecycle including creation, review, and verification"""
    resource_id = None
    
    try:
        headers = get_auth_headers(test_db)
        
        # 使用 FileFactory 创建测试文件
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
        
        # 添加错误信息打印
        if create_response.status_code == 500:
            print(f"Error response content: {create_response.content.decode()}")
            print(f"Error response headers: {dict(create_response.headers)}")

        assert create_response.status_code == status.HTTP_200_OK
        resource_id = create_response.json()["id"]

        # 2. Review resource
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

        # 3. Verify resource
        get_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}?include_pending=true&is_admin=true",
            headers=headers
        )
        assert get_response.status_code == status.HTTP_200_OK
        
        resource_data = get_response.json()
        assert resource_data["title"] == "Lifecycle Test Resource"
        assert resource_data["description"] == "Test for complete resource lifecycle"
        assert resource_data["status"] == "approved"
        assert resource_data["storage_status"] == "synced"
    
    except Exception as e:
        raise

    finally:
        cleanup_resource(resource_id, test_client, test_db, headers)

@pytest.mark.e2e
def test_resource_error_handling(test_client, test_db):
    """Test error handling for resource operations"""
    try:
        # Get authentication headers
        headers = get_auth_headers(test_db)
        
        # Test invalid resource ID
        get_response = test_client.get(f"{RESOURCES_PATH}/99999", headers=headers)
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
        
        # Test invalid file type
        invalid_file = FileFactory.generate_invalid_file()
        
        resource_data = {
            "title": "Invalid Resource",
            "description": "Invalid File Type Test",
            "course_id": "ece 657"
        }

        create_response = test_client.post(
            f"{RESOURCES_PATH}/create",
            files={
                "file": ("test.txt", invalid_file["content"], "text/plain")
            },
            data=resource_data,
            headers=headers
        )
        assert create_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
    except Exception as e:
        raise

@pytest.mark.e2e
def test_resource_storage_sync(test_client, test_db):
    """Test resource storage synchronization and cleanup"""
    resource_id = None
    
    try:
        headers = get_auth_headers(test_db)
        
        # Create resource with storage verification
        resource_data = {
            "title": "Storage Sync Test",
            "description": "Test for storage synchronization",
            "course_id": "ece 657",
            "original_filename": "storage_test.pdf",
            "uploader_id": "1",
            "is_admin": "true"
        }

        files = {
            "file": ("storage_test.pdf", b"test content for storage verification", "application/pdf")
        }

        create_response = test_client.post(
            f"{RESOURCES_PATH}/create",
            files=files,
            data=resource_data,
            headers=headers
        )

        assert create_response.status_code == status.HTTP_200_OK
        resource_id = create_response.json()["id"]
        
        # Verify storage sync status
        get_response = test_client.get(
            f"{RESOURCES_PATH}/{resource_id}",
            headers=headers
        )
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["storage_status"] == "synced"
        
    finally:
        cleanup_resource(resource_id, test_client, test_db, headers)