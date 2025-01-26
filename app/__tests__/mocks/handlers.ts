import { http, HttpResponse } from 'msw';
import { Todo, TodoCreate } from '@/app/types/todo';

const mockTodos: Todo[] = [
  {
    id: 1,
    title: 'Test Todo 1',
    description: 'Description 1',
    is_completed: false,
    priority: 1,
    due_date: '2024-03-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Test Todo 2',
    description: 'Description 2',
    is_completed: true,
    priority: 2,
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const handlers = [
  // GET all todos
  http.get('/api/py/todos/get_all', () => {
    return HttpResponse.json(mockTodos);
  }),

  // CREATE todo
  http.post('/api/py/todos/create', async ({ request }) => {
    const newTodo = await request.json() as TodoCreate;
    const createdTodo = {
      ...newTodo,
      id: Date.now(),
      description: newTodo.description || "",
      is_completed: false,
      priority: newTodo.priority ?? 1,
      due_date: newTodo.due_date ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockTodos.push(createdTodo);
    return HttpResponse.json(createdTodo, { status: 201 });
  }),

  // UPDATE todo
  http.put('/api/py/todos/update/:id', async ({ params, request }) => {
    const todoId = Number(params.id);
    const todoIndex = mockTodos.findIndex(t => t.id === todoId);
    
    if (todoIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    const updates = await request.json() as Partial<Todo>;
    mockTodos[todoIndex] = {
      ...mockTodos[todoIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    return HttpResponse.json(mockTodos[todoIndex], { status: 200 });
  }),

  // DELETE todo
  http.delete('/api/py/todos/delete/:id', ({ params }) => {
    const todoId = Number(params.id);
    const todoIndex = mockTodos.findIndex(t => t.id === todoId);
    
    if (todoIndex !== -1) {
      mockTodos.splice(todoIndex, 1);
    }
    
    return new HttpResponse(null, { status: 200 });
  }),

  // TOGGLE todo
  http.patch('/api/py/todos/:id/toggle-complete', ({ params }) => {
    const todoId = Number(params.id);
    const todo = mockTodos.find(t => t.id === todoId);
    if (!todo) {
      return new HttpResponse(null, { status: 404 });
    }
    
    todo.is_completed = !todo.is_completed;
    return HttpResponse.json(todo, { status: 200 });
  }),
]; 