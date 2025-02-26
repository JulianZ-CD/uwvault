import { Todo, TodoCreate } from "@/app/types/todo";

export const todoService = {
  async getAllTodos(): Promise<Todo[]> {
    const response = await fetch("/api/py/todos/get_all");
    if (!response.ok) {
      throw new Error("Failed to fetch todos");
    }
    return response.json();
  },

  async createTodo(todo: TodoCreate): Promise<Response> {
    return await fetch("/api/py/todos/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
  },

  async updateTodo(id: number, todo: Partial<Todo>): Promise<Response> {
    return await fetch(`/api/py/todos/update/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
  },

  async toggleTodoComplete(id: number): Promise<Response> {
    return await fetch(`/api/py/todos/${id}/toggle-complete`, {
      method: "PATCH",
    });
  },

  async deleteTodo(id: number): Promise<Response> {
    return await fetch(`/api/py/todos/delete/${id}`, {
      method: "DELETE",
    });
  },
}; 