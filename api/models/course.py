from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict, validator
import re

class CourseBase(BaseModel):
    Term: str=Field(default=None)
    Task: str =Field(default=None)
    Title: str=Field(default=None)
    Name: str=Field(default=None)

    # @validator('Task')
    # def validate_task(cls, v):
    #     # Task 格式验证
    #     pattern = r"^[A-Z]{2,4}\s\d{3}(?:\s?[A-Z])?(?:\sT(?:\d{1,2}|_{2}))?$"
    #     if not re.match(pattern, v):
    #         raise ValueError("Invalid Task format. Expected format: 'ECE 602', 'ECE 676A', or 'ECE 780 T12'")
    #     return v

    # @validator('Term')
    # def validate_term(cls, v):
    #     # Term 格式验证
    #     pattern = r"^[WSF]\d{4}$"
    #     if not re.match(pattern, v):
    #         raise ValueError("Invalid Term format. Expected format: 'W2025', 'S2025', or 'F2025'")
    #     return v

    # @validator('Title')
    # def validate_title(cls, v):
    #     # Title 格式验证
    #     if not v or len(v.strip()) == 0:
    #         raise ValueError("Title cannot be empty")
    #     if not re.match(r"^[A-Za-z0-9\s\-_]{3,100}$", v):
    #         raise ValueError("Invalid Title format. Title must be 3-100 characters and contain only letters, numbers, spaces, hyphens, and underscores")
        # return v

class CourseSearch(BaseModel):
    Term: str|None=None
    Task: str|None=None
    Title: str|None=None


    def validate_task(cls, v):
        if v is not None:
            pattern = r"^[A-Z]{2,4}\s\d{3}(?:\s?[A-Z])?(?:\sT(?:\d{1,2}|_{2}))?$"
            if not re.match(pattern, v):
                raise ValueError("Invalid Task format")
        return v
    
    def validate_term(cls, v):
        if v is not None:
            pattern = r"^[WSF]\d{4}$"
            if not re.match(pattern, v):
                raise ValueError("Invalid Term format")
        return v


    def validate_title(cls, v):
        if v is not None:
            if not re.match(r"^[A-Za-z0-9\s\-_]{3,100}$", v):
                raise ValueError("Invalid Title format")
        return v


class CourseTask(BaseModel):
    Task:str=Field(default=None)

class CourseTerm(BaseModel):
    Term:str=Field(default=None)

class CourseTitle(BaseModel):
    Title:str=Field(default=None)
