'use client';

import { Todo } from '@/app/types/todo';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const priorityColors = {
    1: 'bg-gray-500',
    2: 'bg-blue-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500',
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={todo.is_completed}
            onCheckedChange={() => onToggle(todo.id)}
          />
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3
                className={`font-medium ${
                  todo.is_completed ? 'line-through text-gray-500' : ''
                }`}
              >
                {todo.title}
              </h3>
              <Badge
                className={`${
                  priorityColors[todo.priority as keyof typeof priorityColors]
                }`}
              >
                P{todo.priority}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{todo.description}</p>
            {todo.due_date && (
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                {format(todo.due_date, 'yyyy-MM-dd')}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onEdit(todo)}
            aria-label="Edit todo"
          >
            {/* <Pencil className="h-4 w-4" /> */}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                aria-label="Delete todo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your todo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(todo.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
