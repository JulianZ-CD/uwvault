"use client"

import { ColumnDef } from "@tanstack/react-table"
import {Course} from "@/app/types/course"
import React from "react"
import { Link } from "lucide-react"
import { useRouter } from "next/navigation"
// 此类型用于定义我们数据的外观。
// 您可以在此处使用 Zod 架构（如果您愿意）。

export const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "Term",
    header: "Term",
 
  },
  {
    accessorKey: "Task",
    header: "Task",
    cell:({row})=>{
      const router=useRouter()
      const task=row.getValue("Task") as string
      return (
        <button
          onClick={()=>router.push(`/course/${task}/`)}
          className="text-blue-500 hover:text-blue-700"
        >
          {task}
        </button>
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