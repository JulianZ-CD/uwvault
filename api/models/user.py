from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# basic user model


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User email")
    username: str = Field(..., min_length=3, max_length=50,
                          description="Username")
    is_active: bool = Field(default=True, description="Is user active")
    is_superuser: bool = Field(default=False, description="Is user superuser")
    is_verified: bool = Field(default=False, description="Is user verified")

# user create model


class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="User email")
    username: str = Field(..., min_length=3, max_length=50,
                          description="Username")
    password: str = Field(..., min_length=8, description="User password")

# user update model


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, description="User email")
    username: Optional[str] = Field(
        None, min_length=3, max_length=50, description="Username")
    password: Optional[str] = Field(
        None, min_length=8, description="User password")
    is_active: Optional[bool] = Field(None, description="Is user active")
    is_verified: Optional[bool] = Field(None, description="Is user verified")

# full user model (include id and timestamp)


class User(UserBase):
    id: int = Field(..., description="User ID")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Created at")
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Updated at")

    model_config = ConfigDict(from_attributes=True)

# user login model


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")

# user response model (not include password)


class UserResponse(UserBase):
    id: int = Field(..., description="User ID")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
