from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import HTTPBearer
from typing import Dict, Any
from api.services.auth_service import AuthService
from api.models.user import UserCreate, UserLogin, PasswordUpdateRequest
from api.core.config import get_settings

security = HTTPBearer()

router = APIRouter(
    prefix="/api/py/auth",
    tags=["auth"]
)

# dependency injection


async def get_auth_service():
    return AuthService()


@router.post("/register", response_model=Dict[str, Any])
async def register(
    user_data: UserCreate,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    user sign up
    return supabase session info, include access_token and refresh_token
    """
    settings = get_settings()
    if not user_data.redirect_url:
        origin = request.headers.get('origin', settings.DEFAULT_ORIGIN)
        user_data.redirect_url = f"{origin}{settings.VERIFY_EMAIL_URL}"

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
    request: Request,
    email: str = Body(..., embed=True),
    redirect_url: str = Body(None, embed=True),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    send reset password email with redirect URL
    """
    settings = get_settings()
    if not redirect_url:
        origin = request.headers.get('origin', settings.DEFAULT_ORIGIN)
        redirect_url = f"{origin}{settings.RESET_PASSWORD_URL}"

    return await auth_service.reset_password(email, redirect_url)


@router.post("/update-password")
async def update_password(
    request: PasswordUpdateRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Update user password using recovery flow tokens
    """
    try:
        result = await auth_service.update_user_password(
            request.access_token,
            request.refresh_token,
            request.new_password
        )
        return {"message": "Password updated successfully", "result": result}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/users/username")
async def update_username(
    new_username: str = Body(..., embed=True),
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """
    update current login user's username
    """
    return await auth_service.update_username(new_username, token.credentials)


@router.get("/user")
async def get_user(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """
    get current login user info
    """
    return await auth_service.get_current_user(token.credentials)


@router.post("/refresh")
async def refresh_token(
    auth_service: AuthService = Depends(get_auth_service),
    refresh_token: str = Body(..., embed=True)
):
    """
    refresh access token
    return new session info
    """
    return await auth_service.refresh_token(refresh_token)


# add admin check dependency
async def require_admin(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """check if user is admin"""
    user = await auth_service.get_current_user(token.credentials)
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user


# Admin routes
@router.get("/admin/users")
async def list_users(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """list all users (admin only)"""
    await auth_service.require_admin(token.credentials)
    return await auth_service.list_users()


@router.put("/admin/users/{user_id}/role")
async def set_user_role(
    user_id: str,
    role: str = Body(..., embed=True),
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """set user role (admin only)"""
    await auth_service.require_admin(token.credentials)
    if role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
    return await auth_service.set_user_role(user_id, role)


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """delete user (admin only)"""
    await auth_service.require_admin(token.credentials)
    return await auth_service.delete_user(user_id)
