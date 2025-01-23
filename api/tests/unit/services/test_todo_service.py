import pytest
from api.services.todo_service import TodoService
from api.tests.factories import TodoFactory, TodoCreateFactory
from api.models.todo import Todo

@pytest.mark.unit
class TestTodoService:
    def test_get_todos(self, todo_service, mocker):
        # Arrange
        mock_todos = [TodoFactory() for _ in range(3)]
        todo_service.supabase.table().select().execute.return_value.data = [
            todo.model_dump() for todo in mock_todos
        ]

        # Act
        result = todo_service.get_todos()

        # Assert
        assert len(result) == 3
        assert all(isinstance(todo, Todo) for todo in result) 