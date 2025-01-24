'use client'

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Calendar } from "@/app/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { cn } from "@/app/lib/utils"
import { TodoCreate } from "@/app/types/todo"

interface TodoFormProps {
  todo: TodoCreate;
  onTodoChange: (todo: TodoCreate) => void;
  onSubmit: () => void;
}

export function TodoForm({
  todo,
  onTodoChange,
  onSubmit
}: TodoFormProps) {
  // 将字符串日期转换为 Date 对象
  const date = todo.due_date ? new Date(todo.due_date) : undefined;

  // 处理日期选择
  const handleDateSelect = (selectedDate: Date | undefined) => {
    onTodoChange({
      ...todo,
      due_date: selectedDate ? selectedDate.toISOString() : null
    });
  };

  return (
    <div className="space-y-4 mb-8">
      <Input
        placeholder="Enter todo title"
        value={todo.title}
        onChange={(e) => onTodoChange({ ...todo, title: e.target.value })}
      />
      <Input
        placeholder="Enter todo description"
        value={todo.description}
        onChange={(e) => onTodoChange({ ...todo, description: e.target.value })}
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
      <Button onClick={onSubmit}>Add Todo</Button>
    </div>
  )
} 