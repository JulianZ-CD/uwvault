from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Define the base model for todos
class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="Todo title")
    description: Optional[str] = Field(None, max_length=500, description="Todo description")
    is_completed: bool = Field(default=False, description="Is completed")
    priority: int = Field(default=1, ge=1, le=5, description="Priority 1-5, 5 highest")
    due_date: Optional[datetime] = Field(None, description="Due date")

# Model for creating a new todo
class TodoCreate(TodoBase):
    pass

# Model for updating an existing todo
class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_completed: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    due_date: Optional[datetime] = None

# Model for a todo with all fields, including ID and timestamps
class Todo(TodoBase):
    id: int = Field(..., description="Todo ID")
    created_at: datetime = Field(default_factory=datetime.now, description="Created at")
    updated_at: datetime = Field(default_factory=datetime.now, description="Updated at")

    class Config:
        from_attributes = True