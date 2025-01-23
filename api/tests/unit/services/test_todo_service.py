import pytest
from datetime import datetime
from api.services.todo_service import TodoService
from api.models.todo import Todo, TodoCreate, TodoUpdate
from api.tests.factories import TodoFactory, TodoCreateFactory


@pytest.mark.unit
class TestTodoService:
    def test_get_todos(self, todo_service, mocker):
        """Test getting all todos"""
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
        todo_service.supabase.table().select().execute.assert_called_once()

    def test_get_todo_by_id(self, todo_service, mocker):
        """Test getting a single todo by ID"""
        # Arrange
        mock_todo = TodoFactory()
        todo_service.supabase.table().select().eq().single(
        ).execute.return_value.data = mock_todo.model_dump()

        # Act
        result = todo_service.get_todo_by_id(mock_todo.id)

        # Assert
        assert isinstance(result, Todo)
        assert result.id == mock_todo.id
        assert result.title == mock_todo.title
        todo_service.supabase.table().select().eq().single().execute.assert_called_once()

    def test_get_todo_by_id_not_found(self, todo_service, mocker):
        """Test getting a non-existent todo"""
        # Arrange
        todo_service.supabase.table().select().eq(
        ).single().execute.return_value.data = None

        # Act & Assert
        with pytest.raises(ValueError, match="Todo not found"):
            todo_service.get_todo_by_id(999)

    def test_create_todo(self, todo_service, mocker):
        """Test creating a new todo"""
        # Arrange
        todo_create = TodoCreateFactory()
        mock_todo = TodoFactory(
            title=todo_create.title,
            description=todo_create.description,
            priority=todo_create.priority
        )
        todo_service.supabase.table().insert().execute.return_value.data = [
            mock_todo.model_dump()]

        # Act
        result = todo_service.create_todo(todo_create)

        # Assert
        assert isinstance(result, Todo)
        assert result.title == todo_create.title
        assert result.description == todo_create.description
        todo_service.supabase.table().insert().execute.assert_called_once()

    def test_update_todo(self, todo_service, mocker):
        """Test updating an existing todo"""
        # Arrange
        original_todo = TodoFactory()
        update_data = TodoUpdate(title="Updated Title")
        updated_todo_data = original_todo.model_dump()
        updated_todo_data["title"] = update_data.title
        updated_todo_data["updated_at"] = datetime.now()

        todo_service.supabase.table().update().eq(
        ).execute.return_value.data = [updated_todo_data]

        # Act
        result = todo_service.update_todo(original_todo.id, update_data)

        # Assert
        assert isinstance(result, Todo)
        assert result.title == update_data.title
        assert result.id == original_todo.id
        todo_service.supabase.table().update().eq().execute.assert_called_once()

    def test_update_todo_not_found(self, todo_service, mocker):
        """Test updating a non-existent todo"""
        # Arrange
        update_data = TodoUpdate(title="Updated Title")
        todo_service.supabase.table().update().eq().execute.return_value.data = []

        # Act & Assert
        with pytest.raises(ValueError, match="Todo not found"):
            todo_service.update_todo(999, update_data)

    def test_delete_todo(self, todo_service, mocker):
        """Test deleting a todo"""
        # Arrange
        mock_todo = TodoFactory()
        todo_service.supabase.table().delete().eq().execute.return_value.data = [
            mock_todo.model_dump()]

        # Act
        result = todo_service.delete_todo(mock_todo.id)

        # Assert
        assert result is True
        todo_service.supabase.table().delete().eq().execute.assert_called_once()

    def test_delete_todo_not_found(self, todo_service, mocker):
        """Test deleting a non-existent todo"""
        # Arrange
        todo_service.supabase.table().delete().eq().execute.return_value.data = []

        # Act & Assert
        with pytest.raises(ValueError, match="Todo not found"):
            todo_service.delete_todo(999)

    def test_mark_todo_completed(self, todo_service, mocker):
        """Test marking a todo as completed"""
        # Arrange
        mock_todo = TodoFactory(is_completed=False)
        updated_todo_data = mock_todo.model_dump()
        updated_todo_data["is_completed"] = True
        todo_service.supabase.table().update().eq(
        ).execute.return_value.data = [updated_todo_data]

        # Act
        result = todo_service.mark_todo_completed(mock_todo.id)

        # Assert
        assert isinstance(result, Todo)
        assert result.is_completed is True
        todo_service.supabase.table().update().eq().execute.assert_called_once()

    def test_mark_todo_uncompleted(self, todo_service, mocker):
        """Test marking a todo as uncompleted"""
        # Arrange
        mock_todo = TodoFactory(is_completed=True)
        updated_todo_data = mock_todo.model_dump()
        updated_todo_data["is_completed"] = False
        todo_service.supabase.table().update().eq(
        ).execute.return_value.data = [updated_todo_data]

        # Act
        result = todo_service.mark_todo_uncompleted(mock_todo.id)

        # Assert
        assert isinstance(result, Todo)
        assert result.is_completed is False
        todo_service.supabase.table().update().eq().execute.assert_called_once()
