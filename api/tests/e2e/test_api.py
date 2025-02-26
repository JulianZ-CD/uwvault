import pytest
from fastapi import status


@pytest.mark.e2e
def test_todo_crud_flow(test_client):
    """Test complete CRUD flow for todos"""
    # Create todo
    create_data = {
        "title": "E2E Test Todo",
        "description": "Testing the complete flow",
        "priority": 3
    }
    create_response = test_client.post(
        "/api/py/todos/create", json=create_data)
    assert create_response.status_code == status.HTTP_200_OK
    created_todo = create_response.json()
    todo_id = created_todo["id"]

    # Verify all fields in created todo
    assert created_todo["title"] == create_data["title"]
    assert created_todo["description"] == create_data["description"]
    assert created_todo["priority"] == create_data["priority"]

    # Get todos and verify the created todo exists
    get_response = test_client.get("/api/py/todos/get_all")
    assert get_response.status_code == status.HTTP_200_OK
    todos = get_response.json()
    assert len(todos) > 0
    assert any(todo["id"] == todo_id for todo in todos)

    # Update todo
    update_data = {
        "title": "Updated E2E Test Todo",
        "description": "Updated description",
        "priority": 1
    }
    update_response = test_client.put(
        f"/api/py/todos/update/{todo_id}",
        json=update_data
    )
    assert update_response.status_code == status.HTTP_200_OK
    updated_todo = update_response.json()
    assert updated_todo["title"] == update_data["title"]
    assert updated_todo["description"] == update_data["description"]
    assert updated_todo["priority"] == update_data["priority"]

    # Delete todo
    delete_response = test_client.delete(f"/api/py/todos/delete/{todo_id}")
    assert delete_response.status_code == status.HTTP_200_OK

    # Verify todo was deleted
    get_deleted = test_client.get(f"/api/py/todos/get/{todo_id}")
    assert get_deleted.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.e2e
def test_todo_error_cases(test_client):
    """Test error cases for todo operations"""
    # Test invalid todo creation
    invalid_data = {
        "title": "",  # Empty title
        "priority": 999  # Invalid priority
    }
    response = test_client.post("/api/py/todos/create", json=invalid_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Test invalid ID operations
    invalid_id = "999999"
    update_response = test_client.put(
        f"/api/py/todos/update/{invalid_id}",
        json={"title": "Test"}
    )
    assert update_response.status_code == status.HTTP_404_NOT_FOUND

    delete_response = test_client.delete(f"/api/py/todos/delete/{invalid_id}")
    assert delete_response.status_code == status.HTTP_404_NOT_FOUND
