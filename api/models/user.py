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


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="User password")

# user update model


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
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


class UserResponse(BaseModel):
    id: str  # Supabase uses UUID
    email: EmailStr
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PasswordResetRequest(BaseModel):
    email: EmailStr = Field(..., description="User email for password reset")


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
