from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class CourseBase(BaseModel):
    Term: str=Field(default=None)
    Task: str =Field(default=None)
    Title: str=Field(default=None)
    Name: str=Field(default=None)

class CourseSearch(BaseModel):
    Term: str|None=None
    Task: str|None=None
    Title: str|None=None


class CourseTask(BaseModel):
    Task:str=Field(default=None)

class CourseTerm(BaseModel):
    Term:str=Field(default=None)

class CourseTitle(BaseModel):
    Title:str=Field(default=None)
