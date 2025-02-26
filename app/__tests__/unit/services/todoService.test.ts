import { describe, it, expect } from "@jest/globals";
import { todoService } from "@/app/services/todoService";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";
import { Todo, TodoCreate } from "@/app/types/todo";

describe("todoService", () => {
  const mockTodo: TodoCreate = {
    title: "New Todo",
    description: "Description",
    is_completed: false,
    priority: 1,
    due_date: null,
  };

  describe("getAllTodos", () => {
    it("should fetch all todos successfully", async () => {
      const todos = await todoService.getAllTodos();
      expect(todos).toHaveLength(2);
      expect(todos[0].title).toBe("Test Todo 1");
      expect(todos[1].title).toBe("Test Todo 2");
    });

    it("should handle fetch error", async () => {
      // temporary override handler to simulate error
      server.use(
        http.get("/api/py/todos/get_all", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(todoService.getAllTodos()).rejects.toThrow(
        "Failed to fetch todos"
      );
    });
  });

  describe("createTodo", () => {
    it("should create todo successfully", async () => {
      const response = await todoService.createTodo(mockTodo);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.title).toBe(mockTodo.title);
      expect(data.description).toBe(mockTodo.description);
    });

    it("should handle creation error", async () => {
      server.use(
        http.post("/api/py/todos/create", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await todoService.createTodo(mockTodo);
      expect(response.ok).toBe(false);
    });
  });

  describe("updateTodo", () => {
    it("should update todo successfully", async () => {
      const updateData = { title: "Updated Title" };
      const response = await todoService.updateTodo(1, updateData);
      expect(response.ok).toBe(true);
    });

    it("should handle update error", async () => {
      server.use(
        http.put("/api/py/todos/update/:id", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await todoService.updateTodo(1, { title: "Updated" });
      expect(response.ok).toBe(false);
    });
  });

  describe("toggleTodoComplete", () => {
    it("should toggle todo completion successfully", async () => {
      const response = await todoService.toggleTodoComplete(1);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as Todo;
      expect(data.is_completed).toBe(true); // because mock data id=1 todo is false
    });

    it("should handle toggle error", async () => {
      server.use(
        http.patch("/api/py/todos/:id/toggle-complete", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await todoService.toggleTodoComplete(1);
      expect(response.ok).toBe(false);
    });

    it("should handle not found todo", async () => {
      const response = await todoService.toggleTodoComplete(999);
      expect(response.status).toBe(404);
    });
  });

  describe("deleteTodo", () => {
    it("should delete todo successfully", async () => {
      const response = await todoService.deleteTodo(1);
      expect(response.ok).toBe(true);
    });

    it("should handle deletion error", async () => {
      server.use(
        http.delete("/api/py/todos/delete/:id", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await todoService.deleteTodo(1);
      expect(response.ok).toBe(false);
    });
  });

  // test error handling and boundary cases
  describe("error handling", () => {
    it("should handle network errors", async () => {
      server.use(
        http.get("/api/py/todos/get_all", () => {
          return HttpResponse.error();
        })
      );

      await expect(todoService.getAllTodos()).rejects.toThrow();
    });

    it("should handle malformed JSON response", async () => {
      server.use(
        http.get("/api/py/todos/get_all", () => {
          return new HttpResponse("invalid json", { status: 200 });
        })
      );

      await expect(todoService.getAllTodos()).rejects.toThrow();
    });
  });
});
