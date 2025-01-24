"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/app/hooks/use-toast";
import { Todo, TodoCreate } from "@/app/types/todo";
import { TodoForm } from "./components/todo-form";
import { TodoItem } from "./components/todo-item";
import { EditTodoDialog } from "./components/edit-todo-dialog";

export default function TodoPage() {
  const { toast } = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<TodoCreate>({
    title: '',
    description: '',
    is_completed: false,
    priority: 1,
    due_date: null
  });
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/py/todos/get_all");
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch todos",
      });
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const createTodo = async () => {
    if (!newTodo.title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title is required",
      });
      return;
    }

    try {
      const response = await fetch("/api/py/todos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTodo),
      });

      if (response.ok) {
        setNewTodo({
          title: '',
          description: '',
          is_completed: false,
          priority: 1,
          due_date: null
        });
        fetchTodos();
        toast({
          title: "Success",
          description: "Todo created successfully",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create todo",
      });
    }
  };

  const toggleTodo = async (id: number) => {
    try {
      const response = await fetch(`/api/py/todos/${id}/toggle-complete`, {
        method: "PATCH",
      });

      if (response.ok) {
        fetchTodos();
        toast({
          title: "Success",
          description: "Todo status updated",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update todo status",
      });
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      const response = await fetch(`/api/py/todos/delete/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTodos();
        toast({
          title: "Success",
          description: "Todo deleted successfully",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete todo",
      });
    }
  };

  const updateTodo = async () => {
    if (!editingTodo) return;

    try {
      const response = await fetch(`/api/py/todos/update/${editingTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTodo.title,
          description: editingTodo.description,
        }),
      });

      if (response.ok) {
        setEditingTodo(null);
        setIsDialogOpen(false);
        fetchTodos();
        toast({
          title: "Success",
          description: "Todo updated successfully",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update todo",
      });
    }
  };

  const sortedTodos = [...todos].sort((a, b) => {
    // First, sort by is_completed to ensure completed tasks are at the bottom
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1; // Completed tasks are ranked lowest
    }
    // If both tasks have the same completion status, sort by priority
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority tasks come first
    }
    // If both tasks have the same priority, sort by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime(); // Earlier due dates come first
    }
    // If one task has a due date and the other doesn't, the one with a due date comes first
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    // If all else is equal, the order doesn't matter
    return 0;
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Todo List</h1>

      <TodoForm
        todo={newTodo}
        onTodoChange={setNewTodo}
        onSubmit={createTodo}
      />

      <div className="space-y-4">
        {sortedTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onEdit={(todo) => {
              setEditingTodo(todo);
              setIsDialogOpen(true);
            }}
            onDelete={deleteTodo}
          />
        ))}
      </div>

      <EditTodoDialog
        todo={editingTodo}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTodoChange={setEditingTodo}
        onSave={updateTodo}
      />
    </div>
  );
}
