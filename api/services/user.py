from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from supabase import create_client, Client
from api.models.user import UserResponse, UserUpdate
from api.core.config import get_settings
from api.utils.logger import setup_logger


class UserService:
    def __init__(self):
        settings = get_settings()
        self.client: Client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.logger = setup_logger("user_service", "user_service.log")

    async def get_profile(self, user_id: str) -> UserResponse:
        """
        get user profile
        """
        try:
            self.logger.info(f"Fetching profile for user: {user_id}")
            response = self.client.table('profiles').select(
                "*"
            ).eq('id', user_id).single().execute()

            if not response.data:
                self.logger.warning(f"Profile not found for user: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile not found"
                )

            self.logger.info(
                f"Successfully fetched profile for user: {user_id}")
            return UserResponse(**response.data)

        except Exception as e:
            self.logger.error(f"Error fetching profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def update_profile(self, user_id: str, profile_data: UserUpdate) -> UserResponse:
        """
        update user profile
        """
        try:
            self.logger.info(f"Updating profile for user: {user_id}")
            update_data = profile_data.model_dump(exclude_unset=True)

            response = self.client.table('profiles').update(
                update_data
            ).eq('id', user_id).execute()

            if not response.data:
                self.logger.warning(f"Profile not found for update: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile not found"
                )

            self.logger.info(
                f"Successfully updated profile for user: {user_id}")
            return UserResponse(**response.data[0])

        except Exception as e:
            self.logger.error(f"Error updating profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def get_profiles(self, skip: int = 0, limit: int = 10) -> List[UserResponse]:
        """
        get user profile list (pagination)
        """
        try:
            self.logger.info(
                f"Fetching profiles list: skip={skip}, limit={limit}")
            response = self.client.table('profiles').select(
                "*"
            ).range(skip, skip + limit - 1).execute()

            profiles = [UserResponse(**profile) for profile in response.data]
            self.logger.info(f"Successfully fetched {len(profiles)} profiles")
            return profiles

        except Exception as e:
            self.logger.error(f"Error fetching profiles: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def search_profiles(self, query: str, limit: int = 10) -> List[UserResponse]:
        """
        search user profile
        """
        try:
            self.logger.info(f"Searching profiles with query: {query}")
            response = self.client.table('profiles').select(
                "*"
            ).ilike('username', f"%{query}%").limit(limit).execute()

            profiles = [UserResponse(**profile) for profile in response.data]
            self.logger.info(
                f"Found {len(profiles)} profiles matching query: {query}")
            return profiles

        except Exception as e:
            self.logger.error(f"Error searching profiles: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def delete_profile(self, user_id: str) -> bool:
        """
        delete user profile (usually called when user delete account)
        """
        try:
            self.logger.info(f"Deleting profile for user: {user_id}")
            response = self.client.table(
                'profiles').delete().eq('id', user_id).execute()

            if not response.data:
                self.logger.warning(
                    f"Profile not found for deletion: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile not found"
                )

            self.logger.info(
                f"Successfully deleted profile for user: {user_id}")
            return True

        except Exception as e:
            self.logger.error(f"Error deleting profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    async def get_profile_by_username(self, username: str) -> UserResponse:
        """
        get user profile by username
        """
        try:
            self.logger.info(f"Fetching profile for username: {username}")
            response = self.client.table('profiles').select(
                "*"
            ).eq('username', username).single().execute()

            if not response.data:
                self.logger.warning(
                    f"Profile not found for username: {username}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Profile not found"
                )

            self.logger.info(
                f"Successfully fetched profile for username: {username}")
            return UserResponse(**response.data)

        except Exception as e:
            self.logger.error(f"Error fetching profile by username: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
