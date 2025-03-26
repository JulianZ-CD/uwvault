import { columns } from "@/app/course/components/columns"
import { Course, SelectIndex} from "@/app/types/course"
import  DataTable from "@/app/course/components/data_table"
import { courseService } from "@/app/services/courseService"
import Combobox from "@/app/course/components/selectframe"
import React from "react"
import { useState } from "react"
import ClientComponent from "./components/ClientComponent"
import Link from "next/link"




async function getterm():Promise<SelectIndex[]>{
  const frameworks=await fetch("http://localhost:3000/api/py/course/findterm",{
    method:'Post'
  });
  return frameworks.json();
};

async function gettask():Promise<SelectIndex[]>{
  const frameworks=await fetch("http://localhost:3000/api/py/course/findtask",{
    method:'Post'
  });
  return frameworks.json();
};


async function gettitle():Promise<SelectIndex[]>{
  const frameworks=await fetch("http://localhost:3000/api/py/course/findtitle",{
    method:'Post'
  });
  return frameworks.json();
};




export default async function CoursePage(){
  const titles:SelectIndex[]=await gettitle()
  const tasks:SelectIndex[]=await gettask()
  const terms:SelectIndex[]=await getterm()
    return(
        <ClientComponent title={titles} task={tasks} term={terms} data={[]}/>
    )
}

