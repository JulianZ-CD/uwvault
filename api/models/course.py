from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict, validator
import re

class CourseBase(BaseModel):
    Term: str=Field(default=None)
    Task: str =Field(default=None)
    Title: str=Field(default=None)
    Name: str=Field(default=None)

    @validator('Task')
    def validate_task(cls, v):
        if v is not None:
            pattern = r"^[A-Z]{2,4}\s\d{3}(?:\s?[A-Z])?(?:\sT(?:\d{1,2}|_{2}))?$"
            if not re.match(pattern, v):
                raise ValueError("Invalid Task format. Expected format: 'ECE 602', 'ECE 676A', or 'ECE 780 T12'")
        return v

    @validator('Term')
    def validate_term(cls, v):
        if v is not None:
            pattern = r"^[WSF]\d{4}$"
            if not re.match(pattern, v):
                raise ValueError("Invalid Term format. Expected format: 'W2025', 'S2025', or 'F2025'")
        return v

    @validator('Title')
    def validate_title(cls, v):
        if v is not None:
            if not v or len(v.strip()) == 0:
                raise ValueError("Title cannot be empty")
            if not re.match(r"^[A-Za-z0-9\s\-_&.,()/:]+$", v):
                raise ValueError("Invalid Title format. Title must contain only letters, numbers, spaces, hyphens, underscores, ampersands, periods, commas, parentheses, forward slashes, and colons")
        return v

class CourseSearch(BaseModel):
    Term: str|None=None
    Task: str|None=None
    Title: str|None=None

    @validator('Task')
    def validate_task(cls, v):
        if v is not None:
            pattern = r"^[A-Z]{2,4}\s\d{3}(?:\s?[A-Z])?(?:\sT(?:\d{1,2}|_{2}))?$"
            if not re.match(pattern, v):
                raise ValueError("Invalid Task format")
        return v
    
    @validator('Term')
    def validate_term(cls, v):
        if v is not None:
            pattern = r"^[WSF]\d{4}$"
            if not re.match(pattern, v):
                raise ValueError("Invalid Term format")
        return v

    @validator('Title')
    def validate_title(cls, v):
        if v is not None:
            if not v or len(v.strip()) == 0:
                raise ValueError("Title cannot be empty")
            if not re.match(r"^[A-Za-z0-9\s\-_&.,()/]+$", v):
                raise ValueError("Invalid Title format. Title must contain only letters, numbers, spaces, hyphens, underscores, ampersands, periods, commas, and parentheses")
        return v

class CourseTask(BaseModel):
    Task:str=Field(default=None)

class CourseTerm(BaseModel):
    Term:str=Field(default=None)

class CourseTitle(BaseModel):
    Title:str=Field(default=None)
