"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Course } from "@/app/types/course"
import { Button } from "@/app/components/ui/button"
import { useRouter } from "next/navigation"


export const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "Term",
    header: "Term",
  },
  {
    accessorKey: "Task",
    header: "Task",
    cell: ({ row }) => {
      const task = row.getValue("Task") as string
      const router = useRouter()
      
      return (
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={() => router.push(`/resources?course_id=${encodeURIComponent(task)}`)}
        >
          {task}
        </Button>
      )
    }
  },
  {
    accessorKey: "Title",
    header: "Title",
  },
  {
    accessorKey: "Name",
    header: "Name",
  },
]

export default columns;