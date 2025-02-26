import pytest
from fastapi import status
from api.tests.factories import TodoCreateFactory, TodoUpdateFactory
from datetime import datetime, timedelta


@pytest.mark.integration
class TestTodoRouter:
    BASE_URL = "/api/py/todos"  # Matches the prefix defined in the router

    def test_create_todo(self, test_client):
        # Arrange
        todo_data = TodoCreateFactory().model_dump(mode='json')

        # Act
        response = test_client.post(f"{self.BASE_URL}/create", json=todo_data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["title"] == todo_data["title"]
        assert response_data["description"] == todo_data["description"]
        assert "id" in response_data
        assert "created_at" in response_data
        assert "updated_at" in response_data

    def test_get_todos(self, test_client):
        # Arrange
        # First create some test data
        todo1 = TodoCreateFactory().model_dump(mode='json')
        todo2 = TodoCreateFactory().model_dump(mode='json')
        test_client.post(f"{self.BASE_URL}/create", json=todo1)
        test_client.post(f"{self.BASE_URL}/create", json=todo2)

        # Act
        response = test_client.get(f"{self.BASE_URL}/get_all")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        todos = response.json()
        assert isinstance(todos, list)
        assert len(todos) >= 2

    def test_get_todo_by_id(self, test_client):
        # Arrange
        todo_data = TodoCreateFactory().model_dump(mode='json')
        create_response = test_client.post(
            f"{self.BASE_URL}/create", json=todo_data)
        todo_id = create_response.json()["id"]

        # Act
        response = test_client.get(f"{self.BASE_URL}/get/{todo_id}")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        todo = response.json()
        assert todo["id"] == todo_id
        assert todo["title"] == todo_data["title"]

    def test_get_todo_by_id_not_found(self, test_client):
        # Act
        response = test_client.get(f"{self.BASE_URL}/get/99999")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_todo(self, test_client):
        # Arrange
        # First create a todo
        todo_data = TodoCreateFactory().model_dump(mode='json')
        create_response = test_client.post(
            f"{self.BASE_URL}/create", json=todo_data)
        todo_id = create_response.json()["id"]

        # Prepare update data
        update_data = TodoUpdateFactory().model_dump(mode='json', exclude_unset=True)

        # Act
        response = test_client.put(
            f"{self.BASE_URL}/update/{todo_id}", json=update_data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        updated_todo = response.json()
        assert updated_todo["id"] == todo_id
        for key, value in update_data.items():
            if value is not None:
                assert updated_todo[key] == value

    def test_delete_todo(self, test_client):
        # Arrange
        todo_data = TodoCreateFactory().model_dump(mode='json')
        create_response = test_client.post(
            f"{self.BASE_URL}/create", json=todo_data)
        todo_id = create_response.json()["id"]

        # Act
        response = test_client.delete(f"{self.BASE_URL}/delete/{todo_id}")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        # Verify it was actually deleted
        get_response = test_client.get(f"{self.BASE_URL}/get/{todo_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_toggle_todo_complete(self, test_client):
        # Arrange
        todo_data = TodoCreateFactory(
            is_completed=False).model_dump(mode='json')
        create_response = test_client.post(
            f"{self.BASE_URL}/create", json=todo_data)
        todo_id = create_response.json()["id"]

        # Act
        response = test_client.patch(
            f"{self.BASE_URL}/{todo_id}/toggle-complete")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_completed"] is True

    def test_toggle_todo_uncomplete(self, test_client):
        # Arrange
        todo_data = TodoCreateFactory(
            is_completed=True).model_dump(mode='json')
        create_response = test_client.post(
            f"{self.BASE_URL}/create", json=todo_data)
        todo_id = create_response.json()["id"]

        # Act
        response = test_client.patch(
            f"{self.BASE_URL}/{todo_id}/toggle-complete")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_completed"] is False

    def test_create_todo_validation_error(self, test_client):
        # Arrange
        invalid_todo_data = {
            "title": "",  # Empty title, should fail
            "priority": 6  # Priority out of range
        }

        # Act
        response = test_client.post(
            f"{self.BASE_URL}/create", json=invalid_todo_data)

        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_todo_not_found(self, test_client):
        # Arrange
        update_data = TodoUpdateFactory().model_dump(mode='json', exclude_unset=True)

        # Act
        response = test_client.put(
            f"{self.BASE_URL}/update/99999", json=update_data)

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_todos_server_error(self, test_client, mocker):
        """Test server error when getting all todos"""
        # Arrange
        mocker.patch('api.routers.todo_router.todo_service.get_todos',
                    side_effect=Exception("Database error"))

        # Act
        response = test_client.get(f"{self.BASE_URL}/get_all")

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to get todos"

    def test_get_todo_by_id_server_error(self, test_client, mocker):
        """Test server error when getting a todo by ID"""
        # Arrange
        mocker.patch('api.routers.todo_router.todo_service.get_todo_by_id',
                    side_effect=Exception("Database error"))

        # Act
        response = test_client.get(f"{self.BASE_URL}/get/1")

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to get todo"

    def test_create_todo_server_error(self, test_client, mocker):
        """Test server error when creating a todo"""
        # Arrange
        todo_data = TodoCreateFactory().model_dump(mode='json')
        mocker.patch('api.routers.todo_router.todo_service.create_todo',
                    side_effect=Exception("Database error"))

        # Act
        response = test_client.post(f"{self.BASE_URL}/create", json=todo_data)

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to create todo"

    def test_update_todo_server_error(self, test_client, mocker):
        """Test server error when updating a todo"""
        # Arrange
        update_data = TodoUpdateFactory().model_dump(mode='json', exclude_unset=True)
        mocker.patch('api.routers.todo_router.todo_service.update_todo',
                    side_effect=Exception("Database error"))

        # Act
        response = test_client.put(f"{self.BASE_URL}/update/1", json=update_data)

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to update todo"

    def test_delete_todo_server_error(self, test_client, mocker):
        """Test server error when deleting a todo"""
        # Arrange
        mocker.patch('api.routers.todo_router.todo_service.delete_todo',
                    side_effect=Exception("Database error"))

        # Act
        response = test_client.delete(f"{self.BASE_URL}/delete/1")

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to delete todo"

    def test_toggle_todo_complete_server_error(self, test_client, mocker):
        """Test server error when toggling todo complete status"""
        # Arrange
        mocker.patch('api.routers.todo_router.todo_service.get_todo_by_id',
                    side_effect=Exception("Database error"))

        # Act
        response = test_client.patch(f"{self.BASE_URL}/1/toggle-complete")

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Failed to toggle todo status"

    def test_toggle_todo_complete_not_found(self, test_client):
        """Test toggling complete status of non-existent todo"""
        # Act
        response = test_client.patch(f"{self.BASE_URL}/99999/toggle-complete")

        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
