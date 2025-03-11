import factory
from datetime import datetime
from api.models.todo import Todo, TodoCreate, TodoUpdate
from api.models.user import UserCreate, UserLogin, UserUpdate, PasswordUpdateRequest
from factory import Factory, Faker, LazyAttribute, LazyFunction
from api.models.resource import (
    ResourceBase, ResourceCreate, ResourceUpdate, ResourceInDB,
    ResourceReview, ResourceStatus, StorageStatus, StorageOperation,
)
from api.core.mock_auth import MockUser
from api.services.resource_service import ResourceType
import asyncio
from api.core.exceptions import StorageError
from pathlib import Path
import io

def format_datetime():
    """Helper function to format datetime consistently"""
    return datetime.now().isoformat() + 'Z'


class TodoFactory(factory.Factory):
    class Meta:
        model = Todo

    id = factory.Sequence(lambda n: n)
    title = factory.Sequence(lambda n: f'Test Todo {n}')
    description = factory.Sequence(lambda n: f'Test Description {n}')
    is_completed = False
    priority = 1
    due_date = factory.LazyFunction(format_datetime)
    created_at = factory.LazyFunction(format_datetime)
    updated_at = factory.LazyFunction(format_datetime)


class TodoCreateFactory(factory.Factory):
    class Meta:
        model = TodoCreate

    title = factory.Sequence(lambda n: f'New Todo {n}')
    description = factory.Sequence(lambda n: f'New Description {n}')
    is_completed = False
    priority = 1
    due_date = factory.LazyFunction(format_datetime)


class TodoUpdateFactory(factory.Factory):
    class Meta:
        model = TodoUpdate

    title = factory.Sequence(lambda n: f'Updated Todo {n}')
    description = factory.Sequence(lambda n: f'Updated Description {n}')
    # Alternates between True and False
    is_completed = factory.Sequence(lambda n: n % 2 == 0)
    # Generates a priority between 1 and 5
    priority = factory.Sequence(lambda n: (n % 5) + 1)
    due_date = factory.LazyFunction(format_datetime)


# New Auth factories
class UserCreateFactory(factory.Factory):
    class Meta:
        model = UserCreate

    email = factory.Sequence(lambda n: f'user{n}@example.com')
    username = factory.Sequence(lambda n: f'user{n}')
    password = "Test123456!"


class UserLoginFactory(factory.Factory):
    class Meta:
        model = UserLogin

    email = factory.Sequence(lambda n: f'test{n}@qq.com')
    password = "SecurePass123!"


class InvalidUserCreateFactory(factory.Factory):
    class Meta:
        model = UserCreate

    email = "invalid-email"
    password = "short"  #
    username = "a"
    is_active = True
    is_superuser = False
    is_verified = False
    redirect_url = "https://example.com/verify"


class NonExistentUserLoginFactory(factory.Factory):
    class Meta:
        model = UserLogin

    email = factory.Sequence(lambda n: f'nonexistent{n}@example.com')
    password = "WrongPass123!"


class PasswordUpdateRequestFactory(factory.Factory):
    class Meta:
        model = PasswordUpdateRequest

    access_token = factory.Sequence(lambda n: f'token{n}')
    refresh_token = factory.Sequence(lambda n: f'refresh{n}')
    new_password = "NewSecurePass123!"


class AdminUserCreateFactory(UserCreateFactory):
    email = factory.Sequence(lambda n: f'admin{n}@example.com')

# Resource factories
class ResourceFactory(Factory):
    """Factory for ResourceInDB model"""
    class Meta:
        model = ResourceInDB
    
    id = Faker('pyint', min_value=1)
    title = Faker('sentence', nb_words=4)
    description = LazyAttribute(lambda o: f'Test Description {o.id}')
    course_id = "ece 657"
    created_by = Faker('pyint', min_value=1)
    updated_by = Faker('pyint', min_value=1)
    file_type = "pdf"
    file_size = 1024
    storage_path = LazyAttribute(
        lambda o: f"{ResourceType.RESOURCE_FILE.value}/2024/01/test_{o.id}.pdf"
    )
    mime_type = "application/pdf"
    file_hash = Faker('sha256')
    created_at = LazyFunction(datetime.now)
    updated_at = LazyFunction(datetime.now)
    status = ResourceStatus.APPROVED
    is_active = True
    storage_status = StorageStatus.SYNCED
    sync_error = None
    retry_count = 0
    last_sync_at = LazyFunction(datetime.now)

class ResourceCreateFactory(Factory):
    """Factory for ResourceCreate model"""
    class Meta:
        model = ResourceCreate

    title = Faker('sentence', nb_words=4)
    description = Faker('text', max_nb_chars=200)
    course_id = "ece 657"
    file_type = "pdf"
    file_size = 1024
    storage_path = LazyAttribute(
        lambda o: f"{ResourceType.RESOURCE_FILE.value}/2024/01/test.pdf"
    )
    mime_type = "application/pdf"
    file_hash = Faker('sha256')
    original_filename = "test.pdf"
    uploader_id = Faker('pyint', min_value=1)

class ResourceUpdateFactory(Factory):
    """Factory for ResourceUpdate model"""
    class Meta:
        model = ResourceUpdate

    title = Faker('sentence', nb_words=4)
    description = Faker('text', max_nb_chars=200)
    course_id = "ece 657"

class ResourceReviewFactory(Factory):
    """Factory for ResourceReview model"""
    class Meta:
        model = ResourceReview
    
    status = ResourceStatus.APPROVED
    review_comment = Faker('text', max_nb_chars=200)
    reviewed_by = Faker('pyint', min_value=1)

class MockUserFactory(Factory):
    """Factory for MockUser model"""
    class Meta:
        model = MockUser

    id = Faker('pyint', min_value=1)
    username = Faker('user_name')
    is_admin = False

class MockAdminFactory(MockUserFactory):
    """Factory for admin MockUser model"""
    class Meta:
        model = MockUser
    
    is_admin = True

class FileFactory:
    """Factory for file upload testing"""
    
    # Test file paths
    TEST_FILES_DIR = Path(__file__).parent / "e2e" / "test_files"
    TEST_FILE_PATH = TEST_FILES_DIR / "test_document.pdf"
    
    @classmethod
    def setup_test_file(cls):
        """Create test file and directory"""
        cls.TEST_FILES_DIR.mkdir(exist_ok=True)
        if not cls.TEST_FILE_PATH.exists():
            with open(cls.TEST_FILE_PATH, "wb") as f:
                f.write(b"%PDF-1.4\n%Test PDF content")
        return cls.TEST_FILE_PATH

    @classmethod
    def cleanup_test_file(cls):
        """Clean up test file"""
        if cls.TEST_FILE_PATH.exists():
            try:
                cls.TEST_FILE_PATH.unlink()
            except Exception:
                pass

    @staticmethod
    def generate_test_file():
        """Generate a valid test file"""
        return {
            "filename": "test.pdf",
            "content": b"test content",
            "content_type": "application/pdf"
        }
    
    @staticmethod
    def generate_invalid_file():
        """Generate an invalid test file"""
        return {
            "filename": "test.exe",
            "content": b"invalid content",
            "content_type": "application/x-msdownload"
        }
    
    @staticmethod
    async def cleanup_test_files(resource_service, test_prefix: str = "test/") -> None:
        """cleanup test files"""
        try:
            # ensure storage manager is initialized
            await resource_service._ensure_storage_initialized()
            blobs = resource_service._storage_bucket.list_blobs(prefix=test_prefix)
            for blob in blobs:
                blob.delete()
        except Exception as e:
            raise StorageError(f"Failed to cleanup test files: {str(e)}")

    @staticmethod
    async def verify_file_exists(resource_service, file_path: str) -> bool:
        """verify file existence"""
        try:
            # 直接使用 resource_service 的方法验证文件存在
            await resource_service._ensure_storage_initialized()
            blob = resource_service._storage_bucket.blob(file_path)
            exists = await asyncio.get_event_loop().run_in_executor(
                None, blob.exists
            )
            return exists
        except Exception as e:
            raise StorageError(f"Failed to verify file existence: {str(e)}")
            
    @classmethod
    def create(cls):
        """Create a test file (compatibility method for TestFileFactory)"""
        return cls.generate_test_file()