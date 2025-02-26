import { Todo } from "@/app/types/todo";

const baseDate = "2024-01-01T00:00:00Z";

const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 1,
  title: "Test Todo",
  description: "",
  is_completed: false,
  priority: 1,
  due_date: null,
  created_at: baseDate,
  updated_at: baseDate,
  ...overrides
});

export const mockTodos: Todo[] = [
  createTodo({
    id: 1,
    title: "Test Todo 1",
    description: "Description 1",
    priority: 1,
    due_date: "2024-03-01"
  }),
  createTodo({
    id: 2,
    title: "Test Todo 2",
    description: "Description 2",
    is_completed: true,
    priority: 2,
    due_date: null
  })
];

export const createMockTodo = createTodo; 