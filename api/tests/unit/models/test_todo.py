import pytest
from datetime import datetime, timedelta
from api.models.todo import Todo, TodoCreate, TodoUpdate


@pytest.mark.unit
class TestTodoCreate:
    def test_todo_create_success(self):
        """Test successful TodoCreate model creation"""
        todo_data = {
            "title": "Test Todo",
            "description": "Test Description",
            "priority": 3,
            "due_date": datetime.now()
        }
        todo = TodoCreate(**todo_data)
        assert todo.title == todo_data["title"]
        assert todo.description == todo_data["description"]
        assert todo.priority == todo_data["priority"]
        assert todo.is_completed == False  # default value

    def test_todo_create_minimal(self):
        """Test TodoCreate with minimal required fields"""
        todo = TodoCreate(title="Test Todo")
        assert todo.title == "Test Todo"
        assert todo.description == ""  # default value
        assert todo.priority == 1  # default value
        assert todo.is_completed == False  # default value
        assert todo.due_date is None  # default value

    @pytest.mark.parametrize("invalid_data", [
        {"title": ""},  # Empty title
        {"title": "Test", "priority": 0},  # Priority too low
        {"title": "Test", "priority": 6},  # Priority too high
        {"title": "T" * 101},  # Title too long
        {"title": "Test", "description": "D" * 501},  # Description too long
    ])
    def test_todo_create_validation_errors(self, invalid_data):
        """Test TodoCreate validation constraints"""
        with pytest.raises(ValueError):
            TodoCreate(**invalid_data)


@pytest.mark.unit
class TestTodoUpdate:
    def test_todo_update_success(self):
        """Test successful TodoUpdate model creation"""
        update_data = {
            "title": "Updated Todo",
            "description": "Updated Description",
            "priority": 2,
            "is_completed": True,
            "due_date": datetime.now()
        }
        todo_update = TodoUpdate(**update_data)
        assert todo_update.title == update_data["title"]
        assert todo_update.description == update_data["description"]
        assert todo_update.priority == update_data["priority"]
        assert todo_update.is_completed == update_data["is_completed"]

    def test_todo_update_partial(self):
        """Test TodoUpdate with partial fields"""
        todo_update = TodoUpdate(title="Updated Title")
        assert todo_update.title == "Updated Title"
        assert todo_update.description is None
        assert todo_update.priority is None
        assert todo_update.is_completed is None
        assert todo_update.due_date is None

    @pytest.mark.parametrize("invalid_data", [
        {"title": ""},  # Empty title
        {"priority": 0},  # Priority too low
        {"priority": 6},  # Priority too high
        {"title": "T" * 101},  # Title too long
        {"description": "D" * 1001},  # Description too long
    ])
    def test_todo_update_validation_errors(self, invalid_data):
        """Test TodoUpdate validation constraints"""
        with pytest.raises(ValueError):
            TodoUpdate(**invalid_data)


@pytest.mark.unit
class TestTodo:
    def test_todo_create_success(self):
        """Test successful Todo model creation"""
        todo_data = {
            "id": 1,
            "title": "Test Todo",
            "description": "Test Description",
            "priority": 3,
            "is_completed": False,
            "due_date": datetime.now(),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        todo = Todo(**todo_data)
        assert todo.id == todo_data["id"]
        assert todo.title == todo_data["title"]
        assert todo.description == todo_data["description"]
        assert todo.priority == todo_data["priority"]
        assert todo.is_completed == todo_data["is_completed"]

    def test_todo_date_validation(self):
        """Test Todo date validation"""
        future_date = datetime.now() + timedelta(days=7)
        past_date = datetime.now() - timedelta(days=7)

        todo = Todo(
            id=1,
            title="Test Todo",
            created_at=past_date,
            updated_at=datetime.now(),
            due_date=future_date
        )
        assert todo.created_at < todo.updated_at
        assert todo.due_date > todo.created_at

    def test_todo_model_dump(self):
        """Test Todo model serialization"""
        current_time = datetime.now()
        todo_data = {
            "id": 1,
            "title": "Test Todo",
            "description": "Test Description",
            "priority": 3,
            "is_completed": False,
            "due_date": current_time,
            "created_at": current_time,
            "updated_at": current_time
        }
        todo = Todo(**todo_data)
        dumped_data = todo.model_dump()

        assert dumped_data["id"] == todo_data["id"]
        assert dumped_data["title"] == todo_data["title"]
        assert dumped_data["description"] == todo_data["description"]
        assert dumped_data["priority"] == todo_data["priority"]
        assert dumped_data["is_completed"] == todo_data["is_completed"]
        assert isinstance(dumped_data["due_date"], datetime)
        assert isinstance(dumped_data["created_at"], datetime)
        assert isinstance(dumped_data["updated_at"], datetime)
