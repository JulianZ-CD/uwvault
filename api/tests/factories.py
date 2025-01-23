import factory
from datetime import datetime
from api.models.todo import Todo, TodoCreate, TodoUpdate

class TodoFactory(factory.Factory):
    class Meta:
        model = Todo

    id = factory.Sequence(lambda n: n)
    title = factory.Sequence(lambda n: f'Test Todo {n}')
    description = factory.Sequence(lambda n: f'Test Description {n}')
    is_completed = False
    priority = 1
    due_date = factory.LazyFunction(datetime.now)
    created_at = factory.LazyFunction(datetime.now)
    updated_at = factory.LazyFunction(datetime.now)

class TodoCreateFactory(factory.Factory):
    class Meta:
        model = TodoCreate

    title = factory.Sequence(lambda n: f'New Todo {n}')
    description = factory.Sequence(lambda n: f'New Description {n}')
    is_completed = False
    priority = 1
    due_date = factory.LazyFunction(datetime.now) 