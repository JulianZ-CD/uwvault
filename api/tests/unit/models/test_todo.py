import pytest
from datetime import datetime
from api.models.todo import Todo, TodoCreate, TodoUpdate

def test_todo_create():
    """Test TodoCreate model validation"""
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

def test_todo_create_validation():
    """Test TodoCreate validation constraints"""
    with pytest.raises(ValueError):
        TodoCreate(title="", priority=6)  # Invalid title and priority 