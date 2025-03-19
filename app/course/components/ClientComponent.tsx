'use client'

import { columns } from "@/app/course/components/columns"
import { Course, SelectIndex} from "@/app/types/course"
import  DataTable from "@/app/course/components/data_table"
import { courseService } from "@/app/services/courseService"
import Combobox from "@/app/course/components/selectframe"
import React from "react"
import { useState,useEffect } from "react"
import { Loader2 } from "lucide-react"





  interface ClientComponentProps{
    title:SelectIndex[];
    task:SelectIndex[];
    term:SelectIndex[];
    data:Course[];
  }



export default function ClientComponent({title,task,term,data:initialData}:ClientComponentProps) {




  const [selectedTerm,setSelectedTerm] = useState("")
  const [selectedTask,setSelectedTask] = useState("")
  const [selectedTitle,setSelectedTitle] = useState("")
  const [data,setData] = useState<Course[]>([])
  const [isLoading,setIsLoading] = useState(true);

  useEffect(()=>{
    const initialJson=JSON.stringify({})
    getAllCourse(initialJson);
  },[])

  useEffect(()=>{
    createJson();
  },[selectedTerm,selectedTask,selectedTitle])

  async function handleTermChange(selectedValue:string){
    setSelectedTerm(selectedValue);
  }

  async function handleTaskChange(selectedValue:string){
    setSelectedTask(selectedValue);

  }
  
  async function handleTitleChange(selectedValue:string){
    setSelectedTitle(selectedValue);

  }
  
 function createJson(){
    const param:{[key:string]:string}={}
    if(selectedTerm){
      param.Term=selectedTerm;
    }
    if(selectedTask){
      param.Task=selectedTask;
    }
    if(selectedTitle){
      param.Title=selectedTitle;
  }
    const jsonbody=JSON.stringify(param);
    getAllCourse(jsonbody);
}

  async function getAllCourse(jsonbody:string){
    setIsLoading(true);
    try{
    const response = await fetch("http://localhost:3000/api/py/course/findclass",{
      method:'Post',
      headers:{
        'Content-Type':"application/json"
      },
      body:jsonbody
      
  });
   const newData=await response.json();
   setData(newData);
}catch(error){
  console.error("Error fetching data:",error);
}finally{
  setIsLoading(false);
}
  }
    
 function testJson():string{
    const jsonbody=JSON.stringify({       
        "Term":selectedTerm,
        "Task":selectedTask,
        "Title":selectedTitle
    })
    return jsonbody;
  }


  return (
     <div className="mt-10 gap-x-4">
      <div className="flex ml-[10%]">
        <div className="flex space-x-4">
          <Combobox frameworks={term} selectedValue={handleTermChange}/>
        </div>
        <div>
        <Combobox frameworks={task} selectedValue={handleTaskChange}/>
        </div>
        <div>
        <Combobox frameworks={title} selectedValue={handleTitleChange}/>
        </div>
      </div>
      <div className="container mx-auto py-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
       </div>
    </div>
  )
}