import factory
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
from api.models.todo import Todo, TodoCreate, TodoUpdate
import os


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


class TestFileFactory:
    """测试文件工厂"""
    
    @staticmethod
    def create_pdf() -> Path:
        """创建测试PDF文件"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_file.write(b'Test PDF content')
        temp_file.close()
        return Path(temp_file.name)

    @staticmethod
    def create_file(content_type: str) -> Path:
        """根据内容类型创建测试文件"""
        extension_map = {
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'image/jpeg': '.jpg',
            'image/png': '.png'
        }
        
        extension = extension_map.get(content_type, '.tmp')
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
        temp_file.write(b'Test content')
        temp_file.close()
        return Path(temp_file.name)

    @staticmethod
    def create_large_file(size_mb: int) -> Path:
        """创建指定大小的测试文件"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.bin')
        # 写入指定大小的数据
        chunk_size = 1024 * 1024  # 1MB
        with open(temp_file.name, 'wb') as f:
            for _ in range(size_mb):
                f.write(os.urandom(chunk_size))
        return Path(temp_file.name)
