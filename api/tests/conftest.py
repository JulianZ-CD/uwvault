import pytest
from fastapi.testclient import TestClient
from api.index import app
from api.core.config import get_settings, Settings
from api.services.todo_service import TodoService
from dotenv import load_dotenv
import os
@pytest.fixture
def test_settings():
    """Override settings for testing"""
    return Settings(
        SUPABASE_URL="https://test-url.supabase.co",
        SUPABASE_KEY="test-key"
    )


@pytest.fixture
def test_client():
    """Create a test client for FastAPI app"""
    return TestClient(app)


@pytest.fixture
def todo_service(mocker):
    """Create a mocked TodoService"""
    service = TodoService()
    # Mock Supabase client
    mocker.patch.object(service, 'supabase')
    return service

@pytest.fixture()
def env_setup():
    """自动设置环境变量"""
    load_dotenv()
    # 确保必要的环境变量存在
    assert os.getenv("SUPABASE_URL")
    assert os.getenv("SUPABASE_KEY")

@pytest.fixture
def test_course():
    return TestClient(app)