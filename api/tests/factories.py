import factory
from datetime import datetime
from api.models.todo import Todo, TodoCreate, TodoUpdate
from api.models.user import UserCreate, UserLogin, PasswordResetConfirm


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

    email = factory.Sequence(lambda n: f'test{n}@example.com')
    password = factory.Sequence(lambda n: f'SecurePass{n}!')
    username = factory.Sequence(lambda n: f'testuser{n}')


class UserLoginFactory(factory.Factory):
    class Meta:
        model = UserLogin

    email = factory.Sequence(lambda n: f'test{n}@example.com')
    password = factory.Sequence(lambda n: f'SecurePass{n}!')


class PasswordResetConfirmFactory(factory.Factory):
    class Meta:
        model = PasswordResetConfirm

    recovery_token = factory.Sequence(lambda n: f'recovery_token_{n}')
    access_token = factory.Sequence(lambda n: f'access_token_{n}')
    refresh_token = factory.Sequence(lambda n: f'refresh_token_{n}')
    new_password = factory.Sequence(lambda n: f'NewSecurePass{n}!')


# Admin user factory for testing admin operations
class AdminUserCreateFactory(UserCreateFactory):
    class Meta:
        model = UserCreate

    email = factory.Sequence(lambda n: f'admin{n}@example.com')
    username = factory.Sequence(lambda n: f'admin{n}')
    # role is set to "admin" in the service layer
