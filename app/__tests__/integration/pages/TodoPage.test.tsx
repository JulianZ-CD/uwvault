import { render, screen, waitFor } from "../../utils/test-utils";
import TodoPage from "@/app/todo/page";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";

describe("TodoPage", () => {
  describe("initial render", () => {
    it("renders todo list and header", async () => {
      render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(
        screen.getByRole("heading", { name: "Todo List" })
      ).toBeInTheDocument();
      expect(screen.getByText("Test Todo 1")).toBeInTheDocument();
      expect(screen.getByText("Test Todo 2")).toBeInTheDocument();
    });

    it("shows loading state", () => {
      render(<TodoPage />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("handles fetch error", async () => {
      server.use(
        http.get("/api/py/todos/get_all", () => {
          return new HttpResponse(null, {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
      );

      render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await waitFor(
        () => {
          const errorElement = screen.getByText("Failed to fetch todos");
          expect(errorElement).toBeInTheDocument();
        },
        {
          timeout: 3000,
        }
      );
    });
  });

  describe("create todo", () => {
    it("creates new todo successfully", async () => {
      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create New Todo" }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();

      await user.type(
        screen.getByPlaceholderText(/enter todo title/i),
        "New Test Todo"
      );
      await user.type(
        screen.getByPlaceholderText(/enter todo description/i),
        "New Test Description"
      );

      await user.click(screen.getByRole("button", { name: /add todo/i }));

      await waitFor(() => {
        expect(screen.getByText("New Test Todo")).toBeInTheDocument();
      });
    });

    it("handles create error", async () => {
      server.use(
        http.post("/api/py/todos/create", () => {
          return new HttpResponse(
            JSON.stringify({ detail: "Failed to create todo" }),
            { status: 500 }
          );
        })
      );

      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create New Todo" }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();

      await user.type(
        screen.getByPlaceholderText(/enter todo title/i),
        "New Todo"
      );
      await user.click(screen.getByRole("button", { name: /add todo/i }));

      await waitFor(
        () => {
          expect(screen.getByText("Failed to create todo")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe("todo operations", () => {
    it("toggles todo completion", async () => {
      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole("checkbox")[0];
      await user.click(checkbox);

      await waitFor(() => {
        expect(checkbox.getAttribute("data-state")).toBe("checked");
      });
    });

    it("deletes todo", async () => {
      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText("Delete todo");
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(
            "This action cannot be undone. This will permanently delete your todo."
          )
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText("New Test Todo")).not.toBeInTheDocument();
      });
    });

    it("edits todo", async () => {
      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit todo")[0]);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue("Test Todo 2");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Todo");

      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText("Updated Todo")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("handles toggle error", async () => {
      server.use(
        http.patch("/api/py/todos/:id/toggle-complete", () => {
          return new HttpResponse(
            JSON.stringify({ detail: "Failed to toggle todo status" }),
            { status: 500 }
          );
        })
      );

      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getAllByRole("checkbox")[0]);

      await waitFor(
        () => {
          expect(
            screen.getByText("Failed to update todo status")
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("handles delete error", async () => {
      server.use(
        http.delete("/api/py/todos/delete/:id", () => {
          return new HttpResponse(
            JSON.stringify({ detail: "Failed to delete todo" }),
            { status: 500 }
          );
        })
      );

      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText("Delete todo");
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(
            "This action cannot be undone. This will permanently delete your todo."
          )
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to delete todo")).toBeInTheDocument();
      });
    });

    it("handles not found error", async () => {
      server.use(
        http.get("/api/py/todos/get/:id", () => {
          return HttpResponse.json(
            { detail: "Todo not found" },
            { status: 404 }
          );
        })
      );

      render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });
    });

    it("handles create todo network error", async () => {
      server.use(
        http.post("/api/py/todos/create", () => {
          throw new Error("Network error");
        })
      );

      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create New Todo" }));
      await user.type(
        screen.getByPlaceholderText(/enter todo title/i),
        "New Todo"
      );
      await user.click(screen.getByRole("button", { name: /add todo/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create todo")).toBeInTheDocument();
      });
    });

    it("handles update todo network error", async () => {
      server.use(
        http.put("/api/py/todos/update/:id", () => {
          throw new Error("Network error");
        })
      );

      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit todo")[0]);

      const titleInput = screen.getByDisplayValue("Updated Todo");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Todo 2");

      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to update todo")).toBeInTheDocument();
      });
    });
  });

  describe("validation", () => {
    it("shows error when todo title is empty", async () => {
      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create New Todo" }));

      await user.click(screen.getByRole("button", { name: /add todo/i }));

      await waitFor(() => {
        expect(screen.getByText("Title is required")).toBeInTheDocument();
      });
    });

    it("shows error when todo title contains only spaces", async () => {
      const { user } = render(<TodoPage />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Create New Todo" }));

      await user.type(screen.getByPlaceholderText(/enter todo title/i), "   ");
      await user.click(screen.getByRole("button", { name: /add todo/i }));

      await waitFor(() => {
        expect(screen.getByText("Title is required")).toBeInTheDocument();
      });
    });
  });
});
