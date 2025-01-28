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
        self.client: Client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.logger = setup_logger("auth_service", "auth_service.log")

    async def sign_up(self, user_data: UserCreate) -> Dict[str, Any]:
        """
        user sign up
        return user info and session
        """
        try:
            self.logger.info(
                f"Attempting to register user with email: {user_data.email}")
            response = self.client.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "username": user_data.username
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

    async def reset_password(self, email: str) -> bool:
        """
        send password reset email
        """
        try:
            self.logger.info(f"Sending password reset email to: {email}")
            self.client.auth.reset_password_email(email)
            self.logger.info(
                f"Successfully sent password reset email to: {email}")
            return True

        except Exception as e:
            self.logger.error(f"Password reset error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def verify_token(self, token: str):
        try:
            # use supabase client to verify token
            response = self.client.auth.get_user(token)

            # add log
            logger.info(f"User data: {response}")

            # return user data
            return response.user

        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        refresh access token
        return new session info
        """
        try:
            self.logger.info("Attempting to refresh token")
            response = self.client.auth.refresh_session()
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

    async def get_current_user(self) -> Optional[Dict[str, Any]]:
        """
        get current login user info
        """
        try:
            self.logger.info("Attempting to get current user")
            session = self.client.auth.get_session()
            if session and session.user:
                self.logger.info(
                    f"Successfully got current user: {session.user.id}")
                return session.user
            return None

        except Exception as e:
            self.logger.error(f"Get current user error: {str(e)}")
            return None
