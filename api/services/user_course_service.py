import pandas as pd
import lxml
from fastapi import HTTPException,status
import json
from api.models.course import CourseBase
from api.models.course import CourseSearch
from api.utils.logger import setup_logger
from api.core.config import get_settings
from supabase import create_client,Client
import re

class UserCourse:
    def __init__(self):
        settings=get_settings()
        self.supabase:Client=create_client(
            settings.SUPABASE_URL,settings.SUPABASE_KEY)
        self.logger=setup_logger("user_course_logger","user_course_logger.log")
        self.pattern={
            "Task":r'^[A-Z]{2,4}\s\d{3}(?:\s?[A-Z])?(?:\sT(?:\d{1,2}|_{2}))?$',
            "Term":r'^[WSF]\d{4}$',
            "Title":r'^[A-Za-z0-9\s\-_]{3,100}$'

        }
    
    def validate_format(self,field:str,value:str):
        pattern = self.pattern.get(field)
        if not pattern:
            raise ValueError(f"Unknown field: {field}")
            
        if value and not re.match(pattern, value):
            raise ValueError(f"Invalid {field} format")


    def find_course(self, course_index: CourseSearch) -> list[CourseBase]:
        try:
            self.logger.info("Trying to find the course")
            course_index_data = course_index.model_dump()
            self.logger.info(course_index_data)
            
            Task = course_index_data.get("Task")
            Term = course_index_data.get("Term")
            Title = course_index_data.get("Title")

            searching_index = {}
            self.logger.info(f"Task:{Task},Term:{Term},Title:{Title}")

            # 只添加非None的值到搜索条件中
            if Task is not None:
                searching_index["Task"] = Task
            if Term is not None:
                searching_index["Term"] = Term
            if Title is not None:
                searching_index["Title"] = Title
            
            self.logger.info(searching_index)

            try:
                if not searching_index:  # 如果没有搜索条件
                    response = self.supabase.table("course").select("*").execute()
                else:
                    response = self.supabase.table("course").select("*").match(searching_index).execute()
                
                courses = [CourseBase(**course) for course in response.data]
                return courses

            except Exception as db_error:
                self.logger.error(f"Database error: {str(db_error)}")
                return []  # 返回空列表而不是抛出错误

        except Exception as e:
            self.logger.error(f"Error in find_course: {str(e)}")
            return []  # 返回空列表而不是抛出错误
        
    def all_tasks(self):
        try:
            self.logger.info("Find all tasks")
            response=self.supabase.table("course").select("Task").execute()
            not_rep=[]
            all_task=[]
            for each in response.data:
                if each["Task"] not in not_rep:
                    not_rep.append(each["Task"])
            for tasks in not_rep:
                temp={}
                temp["value"]=tasks
                temp["label"]=tasks
                all_task.append(temp)
            return all_task

        except Exception as e:
            self.logger.error(f"Fail to find tasks")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
    def all_terms(self):
        try:
            self.logger.info("Find all terms")
            response=self.supabase.table("course").select("Term").execute()
            not_rep=[]
            all_term=[]
            for each in response.data:
                if each["Term"] not in not_rep:
                    not_rep.append(each["Term"])
            for term in not_rep:
                temp={}
                temp["value"]=term
                temp["label"]=term
                all_term.append(temp)
            return all_term

        except Exception as e:
            self.logger.error(f"Fail to find term")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    def all_title(self):
        try:
            self.logger.info("Find all title")
            response=self.supabase.table("course").select("Title").execute()
            self.logger.info(response)
            not_rep=[]
            all_title=[]
            for each in response.data:
                if each["Title"] not in not_rep:
                    not_rep.append(each["Title"])
            self.logger.info(not_rep)

            for tasks in not_rep:
                temp={}
                temp["value"]=tasks
                temp["label"]=tasks
                all_title.append(temp)
            return all_title

        except Exception as e:
            self.logger.error(f"Fail to find title")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )