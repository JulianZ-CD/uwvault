from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from supabase import create_client, Client
from api.models.user import UserCreate, UserLogin
from api.core.config import get_settings
from api.utils.logger import setup_logger
import logging

logger = logging.getLogger("auth_service")


class AuthService:
    def __init__(self):
        settings = get_settings()
        # normal client
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
        # admin client
        self.admin_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        self.logger = setup_logger("auth_service", "auth_service.log")

    async def sign_up(self, user_data: UserCreate) -> Dict[str, Any]:
        """
        user sign up
        return user info and session
        """
        try:
            self.logger.info(
                f"Attempting to register user with email: {user_data.email}")

            # check if user exists
            users = self.admin_client.auth.admin.list_users()
            for user in users:
                if user.email == user_data.email:
                    self.logger.error(
                        f"User already exists: {user_data.email}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered"
                    )

            # if user not exists, continue register
            response = self.client.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
                "options": {  # user metadata
                    "data": {
                        "username": user_data.username,
                        "role": "user"
                    }
                }
            })

            if response.user:
                self.logger.info(
                    f"Successfully registered user: {response.user.id}")
                return {
                    "user": response.user,
                    "session": response.session
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Registration failed"
                )

        except HTTPException as he:
            # rethrow HTTP exception
            raise he
        except Exception as e:
            self.logger.error(f"Registration error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def sign_in(self, credentials: UserLogin) -> Dict[str, Any]:
        """
        user sign in
        return user info and session
        """
        try:
            self.logger.info(f"Attempting to login user: {credentials.email}")
            response = self.client.auth.sign_in_with_password({
                "email": credentials.email,
                "password": credentials.password
            })

            self.logger.info(
                f"Successfully logged in user: {response.user.id}")
            return {
                "user": response.user,
                "session": response.session
            }

        except Exception as e:
            self.logger.error(f"Login error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

    async def sign_out(self, access_token: str) -> bool:
        """
        user sign out
        """
        try:
            self.logger.info("Attempting to sign out user")
            self.client.auth.sign_out()
            self.logger.info("Successfully signed out user")
            return True

        except Exception as e:
            self.logger.error(f"Sign out error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def reset_password(self, email: str):
        """
        send password reset email
        """
        try:
            self.client.auth.reset_password_for_email(email)
            logger.info(f"Password reset email sent to: {email}")
            return {"message": "Password reset email sent successfully"}
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send reset password email"
            )

    async def update_user_password(self, recovery_token: str, access_token: str, refresh_token: str, new_password: str):
        """
        update user password
        """
        try:
            # set session
            self.client.auth.set_session(access_token, refresh_token)

            # update password
            update_response = self.client.auth.update_user({
                "password": new_password
            })

            logger.info("Password updated successfully")
            return update_response
        except Exception as e:
            logger.error(f"Password update error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update password: {str(e)}"
            )

    async def get_current_user(self, token: str):
        """get current login user info"""
        try:
            response = self.client.auth.get_user(token)
            user = response.user
            logger.info(f"User retrieved: {user.email}")

            return {
                "id": user.id,
                "email": user.email,
                "username": user.user_metadata.get("username", ""),
                "role": user.user_metadata.get("role", "user"),
            }

        except Exception as e:
            logger.error(f"Get current user error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:

        try:
            self.logger.info("Attempting to refresh token")

            response = self.client.auth.refresh_session(refresh_token)

            self.logger.info("Successfully refreshed token")
            return {
                "user": response.user,
                "session": response.session
            }

        except Exception as e:
            self.logger.error(f"Token refresh error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

    # admin function
    async def list_users(self):
        """list all users (admin function)"""
        try:
            users = self.admin_client.auth.admin.list_users()
            return [
                {
                    "id": user.id,
                    "email": user.email,
                    "role": user.user_metadata.get("role", "user"),
                    "created_at": user.created_at,
                    "email_verified": user.email_confirmed_at is not None
                }
                for user in users
            ]
        except Exception as e:
            logger.error(f"List users error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def set_user_role(self, user_id: str, role: str):
        """set user role (admin function)"""
        try:
            response = self.admin_client.auth.admin.update_user_by_id(
                user_id,
                {
                    "user_metadata": {
                        "role": role
                    }
                }
            )
            return response
        except Exception as e:
            logger.error(f"Set user role error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def delete_user(self, user_id: str):
        """delete user (admin function)"""
        try:
            self.admin_client.auth.admin.delete_user(user_id)
            return {"message": f"User {user_id} deleted successfully"}
        except Exception as e:
            logger.error(f"Delete user error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def update_username(self, new_username: str, token: str):
        """
        update username
        """
        try:
            # get current user info
            current_user = await self.get_current_user(token)
            user_id = current_user["id"]

            # update username
            response = self.admin_client.auth.admin.update_user_by_id(
                user_id,
                {
                    "user_metadata": {
                        "role": current_user["role"],
                        "username": new_username
                    }
                }
            )

            self.logger.info(f"Username updated for user: {user_id}")
            return {
                "id": response.user.id,
                "email": response.user.email,
                "username": response.user.user_metadata.get("username"),
                "role": response.user.user_metadata.get("role")
            }

        except Exception as e:
            self.logger.error(f"Update username error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def require_admin(self, token: str):
        """
        check if user is admin
        if not, raise HTTPException
        if yes, return user info
        """
        try:
            current_user = await self.get_current_user(token)
            if current_user["role"] != "admin":
                self.logger.warning(
                    f"Non-admin user attempted admin action: {current_user['email']}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
            return current_user

        except HTTPException as he:
            raise he
        except Exception as e:
            self.logger.error(f"Admin verification error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )
