import { columns } from "./components/columns"
import { Course, SelectIndex} from "../types/course"
import  DataTable from "./components/data_table"
import { courseService } from "@/app/services/courseService"
import Combobox from "./components/selectframe"
import React from "react"
import { useState } from "react"


async function getAllCourse():Promise<Course[]>{
    const response = await fetch("http://localhost:3000/api/py/course/findclass",{
      method:'Post',
      headers:{
        'Content-Type':"application/json"
      },
      body:JSON.stringify({
        "Term":"W2025"
        
      })

});
    return response.json();
  }


  
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



export default async function coursepage() {


  const data = await getAllCourse()

  const terms:SelectIndex[]=await getterm()

  const tasks:SelectIndex[]=await gettask()

  const titles:SelectIndex[]=await gettitle()

  return (
     <div className="mt-10 gap-x-4">
      <div className="flex">
        <div>
          <Combobox frameworks={terms}/>
        </div>
        <div>
        <Combobox frameworks={tasks}/>
        </div>
        <div>
        <Combobox frameworks={titles}/>
        </div>
      </div>
      <div className="container mx-auto py-10">
         <DataTable columns={columns} data={data} />
       </div>
    </div>
  )
}
