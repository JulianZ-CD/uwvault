import factory

from datetime import datetime
from api.models.todo import Todo, TodoCreate, TodoUpdate
from api.models.user import UserCreate, UserLogin, UserUpdate, PasswordUpdateRequest
from api.models.course import  CourseSearch


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


class CourseSearchFactory(factory.Factory):
    class Meta:
        model = CourseSearch
    
    Task=factory.Sequence(lambda n: f'Task{n}')
    Term=factory.Sequence(lambda n: f'Term{n}')
    Title=factory.Sequence(lambda n: f'Title{n}')
