import factory
from datetime import datetime
from api.models.todo import Todo, TodoCreate, TodoUpdate

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