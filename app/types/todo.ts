export interface Todo {
  id: number;
  title: string;
  description: string;
  is_completed: boolean;
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoCreate = {
  title: string;
  description: string;
  is_completed: boolean;
  priority: number;
  due_date: string | null;
} 