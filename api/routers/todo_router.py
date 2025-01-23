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
        return updated_todo
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
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
        todo_service.delete_todo(id)
        return {"message": "Todo deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting todo {id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete todo"
        )

@router.patch("/{id}/toggle-complete")
async def toggle_todo_complete(id: int) -> Todo:
    """Toggle todo complete status"""
    try:
        todo = todo_service.get_todo_by_id(id)
        if todo.is_completed:
            return todo_service.mark_todo_uncompleted(id)
        else:
            return todo_service.mark_todo_completed(id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error toggling todo {id} complete status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle todo status")