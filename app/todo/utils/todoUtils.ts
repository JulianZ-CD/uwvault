import { Todo } from '@/app/types/todo';
import { format } from 'date-fns';

export const sortTodos = (todos: Todo[]) => {
  return [...todos].sort((a, b) => {
    // First, sort by is_completed
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    // Then by priority
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    // Finally by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
};

export const formatDate = (date: string | null) => {
  if (!date) return 'No due date';
  return format(new Date(date), 'yyyy-MM-dd');
};
