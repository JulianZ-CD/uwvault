
import { columns } from "./components/columns"
import { Course } from "../types/course"
import  DataTable from "./components/data_table"
import { courseService } from "@/app/services/courseService"
import React from "react"

async function getData(): Promise<Course[]> {
  // 从您的 API 中获取数据。

  const data = await courseService.getAllCourse();
  return data;
}

export default async function DemoPage() {
  const data = await getData()

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  )
}
