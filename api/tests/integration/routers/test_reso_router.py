import pytest
import time
from fastapi import status
from api.tests.factories import FileFactory, ResourceRatingCreateFactory
from api.models.resource import ResourceStatus, ResourceReview
from api.services.resource_service import ResourceService

@pytest.mark.integration
class TestResourceRouter:
    BASE_URL = "/api/py/resources"
    
    @pytest.fixture(autouse=True)
    def setup_method(self):
        time.sleep(1)  # Prevent rate limiting
        yield
    
    @pytest.fixture
    def resource_service(self):
        """Create a real ResourceService instance"""
        return ResourceService()
    
    @pytest.fixture
    async def cleanup_resources(self, resource_service):
        """Clean up resources after tests"""
        resource_ids = []
        yield resource_ids
        
        # Clean up resources after test
        for resource_id in resource_ids:
            try:
                await resource_service.delete_resource(resource_id)
            except Exception as e:
                print(f"Failed to clean up resource {resource_id}: {e}")
        
        # Clean up test files
        try:
            await FileFactory.cleanup_test_files(resource_service)
        except Exception as e:
            print(f"Failed to clean up test files: {e}")
    
    @pytest.mark.asyncio
    async def test_create_resource_success(
        self, test_client, regular_user_headers, cleanup_resources
    ):
        """Test successful resource creation"""
        # Arrange
        headers, user_id = regular_user_headers
        test_file = FileFactory.create()
        
        form_data = {
            "title": "Test Resource",
            "description": "Test Description",
            "course_id": "CS101"
        }
        files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
        
        # Act
        response = test_client.post(
            f"{self.BASE_URL}/create",
            files=files,
            data=form_data,
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        resource_data = response.json()
        assert "id" in resource_data
        assert resource_data["title"] == form_data["title"]
        assert resource_data["description"] == form_data["description"]
        assert resource_data["course_id"] == form_data["course_id"]
        
        # Add to cleanup
        cleanup_resources.append(resource_data["id"])
    
    @pytest.mark.asyncio
    async def test_create_resource_invalid_file(
        self, test_client, regular_user_headers
    ):
        """Test resource creation with invalid file"""
        # Arrange
        headers, _ = regular_user_headers
        invalid_file = FileFactory.generate_invalid_file()
        
        form_data = {
            "title": "Invalid Resource",
            "description": "Invalid file test",
            "course_id": "CS101"
        }
        files = {"file": (invalid_file["filename"], invalid_file["content"], invalid_file["content_type"])}
        
        # Act
        response = test_client.post(
            f"{self.BASE_URL}/create",
            files=files,
            data=form_data,
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "Unsupported file type" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_get_resource_success(
        self, test_client, regular_user_headers, admin_user_headers, cleanup_resources
    ):
        """Test successfully getting a resource"""
        try:
            # Arrange - Create a resource as admin to ensure it's approved
            admin_headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Admin Resource",
                "description": "Admin Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=admin_headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(1)
            
            # Act - Get the resource as regular user
            headers, _ = regular_user_headers
            response = test_client.get(
                f"{self.BASE_URL}/{resource_id}",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_200_OK
            resource_data = response.json()
            assert resource_data["id"] == resource_id
            assert resource_data["title"] == form_data["title"]
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_get_resource_not_found(
        self, test_client, regular_user_headers
    ):
        """Test getting a non-existent resource"""
        # Arrange
        headers, _ = regular_user_headers
        non_existent_id = 99999  # Assuming this ID doesn't exist
        
        # Act
        response = test_client.get(
            f"{self.BASE_URL}/{non_existent_id}",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_list_resources_success(
        self, test_client, admin_user_headers, cleanup_resources
    ):
        """Test successfully listing resources"""
        try:
            # Arrange - Create resources as admin to ensure they're approved
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            # Create first resource
            form_data1 = {
                "title": "Resource 1",
                "description": "Description 1",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response1 = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data1,
                headers=headers
            )
            
            assert create_response1.status_code == status.HTTP_200_OK
            resource_id1 = create_response1.json()["id"]
            cleanup_resources.append(resource_id1)
            
            # Create second resource
            form_data2 = {
                "title": "Resource 2",
                "description": "Description 2",
                "course_id": "CS102"
            }
            
            create_response2 = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data2,
                headers=headers
            )
            
            assert create_response2.status_code == status.HTTP_200_OK
            resource_id2 = create_response2.json()["id"]
            cleanup_resources.append(resource_id2)
            
            # Wait for resources to be fully processed
            time.sleep(2)
            
            # Act - List resources
            response = test_client.get(
                f"{self.BASE_URL}/",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_200_OK
            resources_data = response.json()
            assert "items" in resources_data
            assert "total" in resources_data
            
            # Verify our created resources are in the list
            resource_ids = [item["id"] for item in resources_data["items"]]
            assert resource_id1 in resource_ids or resource_id2 in resource_ids
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_update_resource_success(
        self, test_client, admin_user_headers, cleanup_resources
    ):
        """Test successfully updating a resource"""
        try:
            # Arrange - Create a resource as admin
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Original Title",
                "description": "Original Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(1)
            
            # Act - Update the resource
            update_data = {
                "title": "Updated Title",
                "description": "Updated Description"
            }
            
            response = test_client.patch(
                f"{self.BASE_URL}/{resource_id}",
                data=update_data,
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_200_OK
            updated_resource = response.json()
            assert updated_resource["title"] == update_data["title"]
            assert updated_resource["description"] == update_data["description"]
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_update_resource_not_found(
        self, test_client, regular_user_headers
    ):
        """Test updating a non-existent resource"""
        # Arrange
        headers, _ = regular_user_headers
        non_existent_id = 99999  # Assuming this ID doesn't exist
        
        update_data = {
            "title": "Updated Title",
            "description": "Updated Description"
        }
        
        # Act
        response = test_client.patch(
            f"{self.BASE_URL}/{non_existent_id}",
            data=update_data,
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_rate_resource_success(
        self, test_client, admin_user_headers, regular_user_headers, cleanup_resources
    ):
        """Test successfully rating a resource"""
        try:
            # Arrange - Create a resource as admin to ensure it's approved
            admin_headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Resource to Rate",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=admin_headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(2)
            
            # Act - Rate the resource as regular user
            user_headers, _ = regular_user_headers
            rating_data = ResourceRatingCreateFactory().model_dump(mode='json')
            
            response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/rating",
                json=rating_data,
                headers=user_headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_200_OK
            rating_result = response.json()
            assert "user_rating" in rating_result
            assert rating_result["user_rating"] == rating_data["rating"]
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_rate_resource_invalid_rating(
        self, test_client, admin_user_headers, regular_user_headers, cleanup_resources
    ):
        """Test rating a resource with invalid rating value"""
        try:
            # Arrange - Create a resource as admin
            admin_headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Resource for Invalid Rating",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=admin_headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(1)
            
            # Act - Rate with invalid value
            user_headers, _ = regular_user_headers
            invalid_rating = {"rating": 6.0}  # Invalid rating > 5
            
            response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/rating",
                json=invalid_rating,
                headers=user_headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_get_user_rating_success(
        self, test_client, admin_user_headers, regular_user_headers, cleanup_resources
    ):
        """Test successfully getting user rating"""
        try:
            # Arrange - Create a resource as admin
            admin_headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Resource for Rating",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=admin_headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(2)
            
            # Rate the resource
            user_headers, _ = regular_user_headers
            rating_data = {"rating": 4.5}
            
            rate_response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/rating",
                json=rating_data,
                headers=user_headers
            )
            
            assert rate_response.status_code == status.HTTP_200_OK
            
            # Act - Get user rating
            get_rating_response = test_client.get(
                f"{self.BASE_URL}/{resource_id}/rating",
                headers=user_headers
            )
            
            # Assert
            assert get_rating_response.status_code == status.HTTP_200_OK
            user_rating = get_rating_response.json()
            assert "user_rating" in user_rating
            assert user_rating["user_rating"] == 4.5
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_get_user_rating_not_found(
        self, test_client, admin_user_headers, regular_user_headers, cleanup_resources
    ):
        """Test getting user rating when none exists"""
        try:
            # Arrange - Create a resource as admin but don't rate it
            admin_headers, _ = admin_user_headers
            test_file = FileFactory.create()

            form_data = {
                "title": "Resource without Rating",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}

            # Create resource as admin
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=admin_headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(2)
            
            # Act - Get rating as regular user
            headers, _ = regular_user_headers
            response = test_client.get(
                f"{self.BASE_URL}/{resource_id}/rating",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_200_OK
            rating_data = response.json()
            assert rating_data.get("user_rating") == 0
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_get_course_ids_success(
        self, test_client, regular_user_headers
    ):
        """Test successfully getting course IDs"""
        # Arrange
        headers, _ = regular_user_headers
        
        # Act
        response = test_client.get(
            f"{self.BASE_URL}/course-ids",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        course_ids = response.json()
        assert isinstance(course_ids, list)
    
    @pytest.mark.asyncio
    async def test_get_upload_history_success(
        self, test_client, regular_user_headers
    ):
        """Test successfully getting upload history"""
        # Arrange
        headers, _ = regular_user_headers
        
        # Act
        response = test_client.get(
            f"{self.BASE_URL}/history/uploads",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
    
    @pytest.mark.asyncio
    async def test_admin_operations(
        self, test_client, admin_user_headers, cleanup_resources
    ):
        """Test admin operations on resources"""
        try:
            # Arrange - Create a resource as admin
            admin_headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Admin Resource",
                "description": "For admin operations",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=admin_headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(2)
            
            # Verify resource is in APPROVED state (admin created)
            get_response = test_client.get(
                f"{self.BASE_URL}/{resource_id}",
                headers=admin_headers
            )
            assert get_response.status_code == status.HTTP_200_OK
            assert get_response.json()["status"] == ResourceStatus.APPROVED.value
            
            # Act 1 - Deactivate resource as admin
            deactivate_response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/deactivate",
                headers=admin_headers
            )
            
            # Assert 1
            assert deactivate_response.status_code == status.HTTP_200_OK
            deactivated_resource = deactivate_response.json()
            assert deactivated_resource["is_active"] is False
            
            # Act 2 - Reactivate resource as admin
            reactivate_response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/reactivate",
                headers=admin_headers
            )
            
            # Assert 2
            assert reactivate_response.status_code == status.HTTP_200_OK
            reactivated_resource = reactivate_response.json()
            assert reactivated_resource["is_active"] is True
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_deactivate_resource_not_found(
        self, test_client, admin_user_headers
    ):
        """Test deactivating a non-existent resource"""
        # Arrange
        headers, _ = admin_user_headers
        resource_id = 99999  # Assuming this ID doesn't exist
        
        # Act
        response = test_client.post(
            f"{self.BASE_URL}/{resource_id}/deactivate",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_reactivate_resource_not_found(
        self, test_client, admin_user_headers
    ):
        """Test reactivating a non-existent resource"""
        # Arrange
        headers, _ = admin_user_headers
        resource_id = 99999  # Assuming this ID doesn't exist
        
        # Act
        response = test_client.post(
            f"{self.BASE_URL}/{resource_id}/reactivate",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_delete_resource_not_found(
        self, test_client, admin_user_headers
    ):
        """Test deleting a non-existent resource"""
        # Arrange
        headers, _ = admin_user_headers
        resource_id = 99999  # Assuming this ID doesn't exist
        
        # Act
        response = test_client.delete(
            f"{self.BASE_URL}/{resource_id}",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_get_available_actions(
        self, test_client, regular_user_headers, admin_user_headers
    ):
        """Test getting available actions for different user roles"""
        # Test regular user actions
        regular_headers, _ = regular_user_headers
        response = test_client.get(
            f"{self.BASE_URL}/actions",
            headers=regular_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        actions = response.json()
        assert actions["can_upload"] is True
        assert actions["can_download"] is True
        assert actions["can_update"] is True
        assert actions["can_rate"] is True
        assert actions["can_delete"] is False  
        assert actions["can_review"] is False 
        
        # Test admin user actions
        admin_headers, _ = admin_user_headers
        response = test_client.get(
            f"{self.BASE_URL}/actions",
            headers=admin_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        actions = response.json()
        assert actions["can_delete"] is True 
        assert actions["can_review"] is True 
        assert actions["can_manage_status"] is True
        assert actions["can_see_all_statuses"] is True
    
    @pytest.mark.asyncio
    async def test_get_available_actions_error(
        self, test_client, mocker
    ):
        """Test error handling in get_available_actions"""
        mocker.patch('api.routers.resources_router.get_current_user', 
                    side_effect=Exception("Test error"))
        
        # Execute the test
        response = test_client.get(
            f"{self.BASE_URL}/actions"
        )
        
        # Assert 
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.asyncio
    async def test_get_resource_download_url(
        self, test_client, admin_user_headers, cleanup_resources
    ):
        """Test getting resource download URL"""
        try:
            # Arrange
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Download URL Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            time.sleep(2)
            
            # Act
            response = test_client.get(
                f"{self.BASE_URL}/{resource_id}/download",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_200_OK
            url = response.text.strip('"')
            assert url.startswith("http")
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_get_resource_download_url_not_found(
        self, test_client, admin_user_headers
    ):
        """Test getting download URL for non-existent resource"""
        headers, _ = admin_user_headers
        
        response = test_client.get(
            f"{self.BASE_URL}/99999/download",
            headers=headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_get_resource_download_url_error(
        self, test_client, admin_user_headers, mocker, cleanup_resources
    ):
        """Test error handling when getting download URL"""
        try:
            # Arrange
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Download URL Error Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(2)
            
            # Mock get_resource_url
            mocker.patch.object(
                ResourceService,
                'get_resource_url',
                side_effect=Exception("Test error")
            )
            
            # Act
            response = test_client.get(
                f"{self.BASE_URL}/{resource_id}/download",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to get download URL"
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_download_resource_file(
        self, test_client, admin_user_headers, cleanup_resources
    ):
        """Test downloading resource file directly"""
        try:
            # Arrange - Create resource
            headers, _ = admin_user_headers
            test_file = FileFactory.create()

            form_data = {
                "title": "Download File Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}

            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )

            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)

            time.sleep(2)

            # Act
            response = test_client.get(
                f"{self.BASE_URL}/{resource_id}/download-file",
                headers=headers
            )

            # Assert
            assert response.status_code == status.HTTP_200_OK
            assert response.headers["content-type"] == "application/octet-stream"
            assert "content-disposition" in response.headers
            assert len(response.content) > 0
        
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_download_resource_file_not_found(
        self, test_client, admin_user_headers
    ):
        """Test downloading file for non-existent resource"""
        headers, _ = admin_user_headers
        
        response = test_client.get(
            f"{self.BASE_URL}/99999/download-file",
            headers=headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_download_resource_file_error(
        self, test_client, admin_user_headers, mocker, cleanup_resources
    ):
        """Test error handling when downloading file"""
        try:
            # Arrange - Create resource
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Download File Error Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            # Wait for resource to be fully processed
            time.sleep(2)
            
            mocker.patch.object(
                ResourceService,
                'get_resource_url',
                side_effect=Exception("Test error")
            )
            
            # Act
            response = test_client.get(
                f"{self.BASE_URL}/{resource_id}/download-file",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to download resource"
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_get_course_ids_error(
        self, test_client, mocker, admin_user_headers
    ):
        """Test error handling in get_course_ids"""
        # Arrange
        headers, _ = admin_user_headers
        
        mocker.patch.object(
            ResourceService,
            'get_all_course_ids',
            side_effect=Exception("Test error")
        )
        
        # Act
        response = test_client.get(
            f"{self.BASE_URL}/course-ids",
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to get course IDs"
    
    @pytest.mark.asyncio
    async def test_create_resource_error(
        self, test_client, regular_user_headers, mocker
    ):
        """Test error handling in create_resource"""
        # Arrange
        headers, _ = regular_user_headers
        test_file = FileFactory.create()
        
        form_data = {
            "title": "Error Test Resource",
            "description": "Test Description",
            "course_id": "CS101"
        }
        files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
        
        # Mock the create_resource method to raise an exception
        mocker.patch.object(
            ResourceService, 
            'create_resource',
            side_effect=Exception("Test error")
        )
        
        # Act
        response = test_client.post(
            f"{self.BASE_URL}/create",
            files=files,
            data=form_data,
            headers=headers
        )
        
        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to create resource"
    
    @pytest.mark.asyncio
    async def test_review_resource(
        self, test_client, admin_user_headers, regular_user_headers, cleanup_resources
    ):
        """Test reviewing a resource (admin only)"""
        try:
            # Arrange - Create resource
            user_headers, _ = regular_user_headers
            admin_headers, admin_id = admin_user_headers
            test_file = FileFactory.create()

            form_data = {
                "title": "Review Test Resource",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}

            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=user_headers
            )

            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)

            time.sleep(2)

            # Act - Admin review resource
            review_data = ResourceReview(
                status=ResourceStatus.APPROVED,
                review_comment="Looks good!",
                reviewed_by=admin_id
            ).model_dump()

            response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/review",
                json=review_data,
                headers=admin_headers
            )

            # Assert
            assert response.status_code == status.HTTP_200_OK
            resource = response.json()
            assert resource["status"] == ResourceStatus.APPROVED.value
            assert resource["review_comment"] == "Looks good!"

        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")

    @pytest.mark.asyncio
    async def test_review_resource_not_found(
        self, test_client, admin_user_headers
    ):
        """Test reviewing a non-existent resource"""
        headers, admin_id = admin_user_headers

        review_data = ResourceReview(
            status=ResourceStatus.APPROVED,
            review_comment="Looks good!",
            reviewed_by=admin_id
        ).model_dump()

        response = test_client.post(
            f"{self.BASE_URL}/99999/review",
            json=review_data,
            headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_review_resource_error(
        self, test_client, admin_user_headers, mocker, cleanup_resources
    ):
        """Test error handling when reviewing a resource"""
        try:
            # Arrange - Create resource
            headers, admin_id = admin_user_headers
            test_file = FileFactory.create()

            form_data = {
                "title": "Review Error Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}

            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )

            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)

            time.sleep(2)

            mocker.patch.object(
                ResourceService,
                'review_resource',
                side_effect=Exception("Test error")
            )

            # Act
            review_data = ResourceReview(
                status=ResourceStatus.APPROVED,
                review_comment="Looks good!",
                reviewed_by=admin_id
            ).model_dump()

            response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/review",
                json=review_data,
                headers=headers
            )

            # Assert
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to review resource"

        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_update_resource_error(
        self, test_client, regular_user_headers, mocker, cleanup_resources
    ):
        """Test error handling when updating a resource"""
        try:
            # Arrange - Create resource
            headers, _ = regular_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Update Error Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            time.sleep(2)
            
            mocker.patch.object(
                ResourceService,
                'update_resource',
                side_effect=Exception("Test error")
            )
            
            # Act
            update_data = {
                "title": "Updated Title",
                "description": "Updated Description"
            }
            
            response = test_client.patch(
                f"{self.BASE_URL}/{resource_id}",
                data=update_data,
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to update resource"
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_deactivate_reactivate_resource(
        self, test_client, admin_user_headers, cleanup_resources
    ):
        """Test deactivating and reactivating a resource"""
        try:
            # Arrange - Create resource
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Deactivate Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            time.sleep(2)
            
            # Act - Deactivate resource
            deactivate_response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/deactivate",
                headers=headers
            )
            
            # Assert
            assert deactivate_response.status_code == status.HTTP_200_OK
            resource = deactivate_response.json()
            assert resource["is_active"] == False
            
            # Act - Reactivate resource
            reactivate_response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/reactivate",
                headers=headers
            )
            
            # Assert
            assert reactivate_response.status_code == status.HTTP_200_OK
            resource = reactivate_response.json()
            assert resource["is_active"] == True
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_deactivate_resource_error(
        self, test_client, admin_user_headers, mocker, cleanup_resources
    ):
        """Test error handling when deactivating a resource"""
        try:
            # Arrange - Create resource
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Deactivate Error Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            time.sleep(2)
            
            mocker.patch.object(
                ResourceService,
                'deactivate_resource',
                side_effect=Exception("Test error")
            )
            
            # Act
            response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/deactivate",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to deactivate resource"
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_reactivate_resource_error(
        self, test_client, admin_user_headers, mocker, cleanup_resources
    ):
        """Test error handling when reactivating a resource"""
        try:
            # Arrange - Create resource
            headers, _ = admin_user_headers
            test_file = FileFactory.create()
            
            form_data = {
                "title": "Reactivate Error Test",
                "description": "Test Description",
                "course_id": "CS101"
            }
            files = {"file": (test_file["filename"], test_file["content"], test_file["content_type"])}
            
            create_response = test_client.post(
                f"{self.BASE_URL}/create",
                files=files,
                data=form_data,
                headers=headers
            )
            
            assert create_response.status_code == status.HTTP_200_OK
            resource_id = create_response.json()["id"]
            cleanup_resources.append(resource_id)
            
            time.sleep(2)
            
            mocker.patch.object(
                ResourceService,
                'reactivate_resource',
                side_effect=Exception("Test error")
            )
            
            # Act
            response = test_client.post(
                f"{self.BASE_URL}/{resource_id}/reactivate",
                headers=headers
            )
            
            # Assert
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.json()["detail"] == "Failed to reactivate resource"
            
        except Exception as e:
            pytest.fail(f"Test failed: {str(e)}")