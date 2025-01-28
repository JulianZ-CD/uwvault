from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any
from api.services.auth import AuthService
from api.models.user import UserCreate, UserLogin

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
    request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    user sign out
    use supabase session management
    """
    # get token from request header
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        return await auth_service.sign_out(token)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token"
    )


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


@router.get("/user", response_model=Dict[str, Any])
async def get_user(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    get current user info
    use supabase session verification
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    token = auth_header.split(' ')[1]
    return await auth_service.verify_token(token)
