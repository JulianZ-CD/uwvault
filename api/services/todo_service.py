from supabase import create_client, Client
from typing import List, Optional
from api.models.todo import Todo, TodoCreate, TodoUpdate
from datetime import datetime
from api.utils.logger import setup_logger
from api.core.config import get_settings

class TodoService:
    def __init__(self):
        settings = get_settings()
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.logger = setup_logger("todo_service", "todo_service.log")
    
    def get_todos(self) -> List[Todo]:
        try:
            self.logger.info("Fetching all todos")
            response = self.supabase.table('todos').select("*").execute()
            todos = [Todo(**todo) for todo in response.data]
            self.logger.info(f"Successfully fetched {len(todos)} todos")
            return todos
        except Exception as e:
            self.logger.error(f"Unexpected error while fetching todos: {str(e)}")
            raise
    
    def create_todo(self, todo: TodoCreate) -> Todo:
        try:
            self.logger.info(f"Creating new todo with title: {todo.title}")
            todo_data = todo.model_dump()
            current_time = datetime.now().isoformat()
            todo_data["created_at"] = current_time
            todo_data["updated_at"] = current_time
            
            if todo_data.get("due_date"):
                todo_data["due_date"] = todo_data["due_date"].isoformat()
            
            response = self.supabase.table('todos').insert(todo_data).execute()
            created_todo = Todo(**response.data[0])
            self.logger.info(f"Successfully created todo with id: {created_todo.id}")
            return created_todo
        except Exception as e:
            self.logger.error(f"Unexpected error while creating todo: {str(e)}")
            raise
    
    def get_todo_by_id(self, id: int) -> Todo:
        try:
            self.logger.info(f"Fetching todo with id: {id}")
            response = self.supabase.table('todos').select("*").eq('id', id).single().execute()
            
            if not response.data:
                self.logger.warning(f"Todo with id {id} not found")
                raise ValueError("Todo not found")
                
            todo = Todo(**response.data)
            self.logger.info(f"Successfully fetched todo with id: {id}")
            return todo
        except Exception as e:
            self.logger.error(f"Error while fetching todo {id}: {str(e)}")
            raise
    
    def update_todo(self, id: int, todo: TodoUpdate) -> Todo:
        try:
            self.logger.info(f"Updating todo with id: {id}")
            todo_data = todo.model_dump(exclude_unset=True)
            todo_data["updated_at"] = datetime.now().isoformat()
            
            if todo_data.get("due_date"):
                todo_data["due_date"] = todo_data["due_date"].isoformat()
            
            response = self.supabase.table('todos').update(todo_data).eq('id', id).execute()
            if not response.data:
                self.logger.warning(f"Todo with id {id} not found for update")
                raise ValueError("Todo not found")
                
            updated_todo = Todo(**response.data[0])
            self.logger.info(f"Successfully updated todo with id: {id}")
            return updated_todo
        except Exception as e:
            self.logger.error(f"Unexpected error while updating todo {id}: {str(e)}")
            raise
    
    def delete_todo(self, id: int) -> bool:
        try:
            self.logger.info(f"Deleting todo with id: {id}")
            response = self.supabase.table('todos').delete().eq('id', id).execute()
            if not response.data:
                self.logger.warning(f"Todo with id {id} not found for deletion")
                raise ValueError("Todo not found")
            
            self.logger.info(f"Successfully deleted todo with id: {id}")
            return True
        except Exception as e:
            self.logger.error(f"Unexpected error while deleting todo {id}: {str(e)}")
            raise

    def mark_todo_completed(self, id: int) -> Todo:
        try:
            self.logger.info(f"Marking todo {id} as completed")
            response = self.supabase.table('todos').update({
                'is_completed': True,
                'updated_at': datetime.now().isoformat()
            }).eq('id', id).execute()
            
            if not response.data:
                self.logger.warning(f"Todo with id {id} not found")
                raise ValueError("Todo not found")
                
            updated_todo = Todo(**response.data[0])
            self.logger.info(f"Successfully marked todo {id} as completed")
            return updated_todo
        except Exception as e:
            self.logger.error(f"Error while marking todo {id} as completed: {str(e)}")
            raise

    def mark_todo_uncompleted(self, id: int) -> Todo:
        try:
            self.logger.info(f"Marking todo {id} as uncompleted")
            response = self.supabase.table('todos').update({
                'is_completed': False,
                'updated_at': datetime.now().isoformat()
            }).eq('id', id).execute()
            
            if not response.data:
                self.logger.warning(f"Todo with id {id} not found")
                raise ValueError("Todo not found")
                
            updated_todo = Todo(**response.data[0])
            self.logger.info(f"Successfully marked todo {id} as uncompleted")
            return updated_todo
        except Exception as e:
            self.logger.error(f"Error while marking todo {id} as uncompleted: {str(e)}")
            raise