from typing import Optional
from pydantic import BaseModel

class MockUser(BaseModel):
    """Mock user model for testing"""
    id: int
    username: str
    is_admin: bool = False

async def get_current_user():
    """Mock current user for testing"""
    return MockUser(
        id=1,
        username="test_user",
        is_admin=False
    )

async def get_admin_user():
    """Mock admin user for testing"""
    return MockUser(
        id=999,
        username="admin",
        is_admin=True
    )

async def require_admin():
    """Mock admin requirement"""
    return await get_admin_user() 