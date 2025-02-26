from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict

class CourseBase(BaseModel):
    term: str=Field(default=None)
    task: str =Field(default=None)
    title: str=Field(default=None)
    name: str=Field(default=None)