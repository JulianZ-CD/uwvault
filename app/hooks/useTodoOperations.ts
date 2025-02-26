import { useState, useEffect } from "react";
import { Todo, TodoCreate } from "@/app/types/todo";
import { todoService } from "@/app/services/todoService";
import { useToast } from "@/app/hooks/use-toast";

export function useTodoOperations() {
  const { toast } = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showAlert = (message: string, type: "success" | "error") => {
    if (type === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setError(message);
    } else {
      toast({
        title: "Success",
        description: message,
        className: "border-green-500 text-green-700",
      });
      setError(null);
    }
  };

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const data = await todoService.getAllTodos();
      setTodos(data);
    } catch {
      showAlert("Failed to fetch todos", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const createTodo = async (newTodo: TodoCreate) => {
    if (!newTodo.title.trim()) {
      showAlert("Title is required", "error");
      return false;
    }

    try {
      const response = await todoService.createTodo(newTodo);
      if (response.ok) {
        await fetchTodos();
        showAlert("Todo created successfully", "success");
        return true;
      }
    } catch {}
    showAlert("Failed to create todo", "error");
    return false;
  };

  const updateTodo = async (id: number, todoData: Partial<Todo>) => {
    try {
      const response = await todoService.updateTodo(id, todoData);
      if (response.ok) {
        await fetchTodos();
        showAlert("Todo updated successfully", "success");
        return true;
      }
    } catch {}
    showAlert("Failed to update todo", "error");
    return false;
  };

  const toggleTodo = async (id: number) => {
    try {
      const response = await todoService.toggleTodoComplete(id);
      if (response.ok) {
        await fetchTodos();
        showAlert("Todo status updated", "success");
        return true;
      }
    } catch {}
    showAlert("Failed to update todo status", "error");
    return false;
  };

  const deleteTodo = async (id: number) => {
    try {
      const response = await todoService.deleteTodo(id);
      if (response.ok) {
        await fetchTodos();
        showAlert("Todo deleted successfully", "success");
        return true;
      }
    } catch {}
    showAlert("Failed to delete todo", "error");
    return false;
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return {
    todos,
    isLoading,
    error,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
  };
}
