from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Dict, Any
from api.services.auth import AuthService
from api.models.user import UserCreate, UserLogin

# 添加安全方案
security = HTTPBearer()

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# dependency injection


async def get_auth_service():
    return AuthService()


@router.post("/register", response_model=Dict[str, Any])
async def register(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    user sign up
    return supabase session info, include access_token and refresh_token
    """
    return await auth_service.sign_up(user_data)


@router.post("/login", response_model=Dict[str, Any])
async def login(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    user sign in
    return supabase session info, include access_token and refresh_token
    """
    return await auth_service.sign_in(credentials)


@router.post("/logout")
async def logout(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """
    user sign out
    use supabase session management
    """
    return await auth_service.sign_out(token.credentials)


@router.post("/reset-password")
async def reset_password(
    email: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    send reset password email
    use supabase password reset feature
    """
    return await auth_service.reset_password(email)


@router.get("/user")
async def get_user(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """
    get current user info
    use supabase session verification
    """
    return await auth_service.verify_token(token.credentials)
