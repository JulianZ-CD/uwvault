from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer
from typing import Dict, Any
from api.services.auth import AuthService
from api.models.user import UserCreate, UserLogin,  PasswordResetConfirm


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


@router.post("/update-password")
async def update_password(
    request: PasswordResetConfirm,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    update user password using reset token
    """
    try:
        result = await auth_service.update_user_password(
            request.recovery_token,
            request.access_token,
            request.refresh_token,
            request.new_password
        )
        return {"message": "Password updated successfully", "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


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


# admin routes
@router.get("/admin/users", dependencies=[Depends(require_admin)])
async def list_users(
    auth_service: AuthService = Depends(get_auth_service)
):
    """list all users (only admin)"""
    return await auth_service.list_users()


@router.put("/admin/users/{user_id}/role", dependencies=[Depends(require_admin)])
async def set_user_role(
    user_id: str,
    role: str = Body(..., embed=True),
    auth_service: AuthService = Depends(get_auth_service)
):
    """set user role (only admin)"""
    if role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )
    return await auth_service.set_user_role(user_id, role)


@router.delete("/admin/users/{user_id}", dependencies=[Depends(require_admin)])
async def delete_user(
    user_id: str,
    auth_service: AuthService = Depends(get_auth_service)
):
    """delete user (only admin)"""
    return await auth_service.delete_user(user_id)
