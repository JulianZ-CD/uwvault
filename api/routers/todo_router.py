from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from api.models.todo import Todo, TodoCreate, TodoUpdate
from api.services.todo_service import TodoService
from api.utils.logger import setup_logger

router = APIRouter(
    prefix="/api/py/todos",
    tags=["todos"]
)

todo_service = TodoService()
logger = setup_logger("todo_router", "todo_router.log")

@router.get("/get_all")
async def get_todos() -> List[Todo]:
    """
    Get all todos
    """
    try:
        return todo_service.get_todos()
    except Exception as e:
        logger.error(f"Error getting todos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get todos"
        )

@router.post("/create")
async def create_todo(todo: TodoCreate) -> Todo:
    """
    Create a new todo
    """
    try:
        return todo_service.create_todo(todo)
    except Exception as e:
        logger.error(f"Error creating todo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create todo"
        )

@router.put("/update/{id}")
async def update_todo(id: int, todo: TodoUpdate) -> Todo:
    """
    Update a todo
    """
    try:
        updated_todo = todo_service.update_todo(id, todo)
        if not updated_todo:
            raise HTTPException(
                status_code=404,
                detail="Todo not found"
            )
        return updated_todo
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating todo {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update todo"
        )

@router.delete("/delete/{id}")
async def delete_todo(id: int) -> Dict[str, str]:
    """
    Delete a todo
    """
    try:
        if not todo_service.delete_todo(id):
            raise HTTPException(
                status_code=404,
                detail="Todo not found"
            )
        return {"message": "Todo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting todo {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete todo"
        )