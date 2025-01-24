'use client'

import { Todo } from "@/app/types/todo"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"

interface EditTodoDialogProps {
  todo: Todo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTodoChange: (todo: Todo) => void;
  onSave: () => void;
}

export function EditTodoDialog({
  todo,
  isOpen,
  onOpenChange,
  onTodoChange,
  onSave
}: EditTodoDialogProps) {
  if (!todo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Todo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={todo.title}
            onChange={(e) => onTodoChange({
              ...todo,
              title: e.target.value
            })}
          />
          <Input
            value={todo.description}
            onChange={(e) => onTodoChange({
              ...todo,
              description: e.target.value
            })}
          />
          <Button onClick={onSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 