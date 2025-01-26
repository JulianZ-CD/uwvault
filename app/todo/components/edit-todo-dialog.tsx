'use client'

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Todo } from "@/app/types/todo"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Calendar } from "@/app/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover"
import { cn } from "@/app/lib/utils"

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

  // Convert string date to Date object
  const date = todo.due_date ? new Date(todo.due_date) : undefined;

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    onTodoChange({
      ...todo,
      due_date: selectedDate ? selectedDate.toISOString() : null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Todo</DialogTitle>
          <DialogDescription>Edit the todo item by filling out the form below.</DialogDescription>
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
          <div className="flex space-x-4">
            <Select
              value={todo.priority.toString()}
              onValueChange={(value) => onTodoChange({ ...todo, priority: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((p) => (
                  <SelectItem key={p} value={p.toString()}>
                    Priority {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={onSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 