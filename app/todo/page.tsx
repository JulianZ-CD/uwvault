"use client";

import { useState } from "react";
import { Todo, TodoCreate } from "@/app/types/todo";
import { useTodoOperations } from "@/app/hooks/useTodoOperations";

import { TodoForm } from "./components/todo-form";
import { TodoItem } from "./components/todo-item";
import { EditTodoDialog } from "./components/edit-todo-dialog";
import { sortTodos } from "./utils/todoUtils";

export default function TodoPage() {
  const { todos, isLoading, error, createTodo, updateTodo, toggleTodo, deleteTodo } =
    useTodoOperations();

  const [newTodo, setNewTodo] = useState<TodoCreate>({
    title: "",
    description: "",
    is_completed: false,
    priority: 1,
    due_date: null,
  });
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateTodo = async () => {
    const success = await createTodo(newTodo);
    if (success) {
      setNewTodo({
        title: "",
        description: "",
        is_completed: false,
        priority: 1,
        due_date: null,
      });
    }
  };

  const handleUpdateTodo = async () => {
    if (!editingTodo) return;
    const success = await updateTodo(editingTodo.id, editingTodo);
    if (success) {
      setEditingTodo(null);
      setIsDialogOpen(false);
    }
  };

  const sortedTodos = sortTodos(todos);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Todo List</h1>

      <TodoForm
        todo={newTodo}
        onTodoChange={setNewTodo}
        onSubmit={handleCreateTodo}
      />

      <div className="my-8"></div>

      <div className="space-y-2">
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
        onSave={handleUpdateTodo}
      />
    </div>
  );
}
