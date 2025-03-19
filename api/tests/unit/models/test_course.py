import pytest
from api.models.course import CourseBase, CourseSearch
from pydantic import ValidationError

@pytest.mark.unit
class TestCourseBase:
    def test_course_base_success(self):
        """测试成功创建课程基础模型"""
        course_data = {
            "Task": "ECE 602",
            "Term": "W2025",
            "Title": "Digital Systems"
        }
        course = CourseBase(**course_data)
        assert course.Task == course_data["Task"]
        assert course.Term == course_data["Term"]
        assert course.Title == course_data["Title"]

    @pytest.mark.parametrize("invalid_data,expected_error", [
        (
            {
                "Task": "ECE602",  # 缺少空格
                "Term": "W2025",
                "Title": "Digital Systems"
            },
            "Invalid Task format"
        ),
        (
            {
                "Task": "ECE 602",
                "Term": "X2025",  # 无效学期
                "Title": "Digital Systems"
            },
            "Invalid Term format"
        ),
        (
            {
                "Task": "ECE 602",
                "Term": "W2025",
                "Title": ""  # 空标题
            },
            "Title cannot be empty"
        ),
    ])
    def test_course_base_validation_errors(self, invalid_data, expected_error):
        """测试课程模型的验证约束"""
        with pytest.raises(ValidationError) as exc_info:
            CourseBase(**invalid_data)
        assert expected_error in str(exc_info.value)

@pytest.mark.unit
class TestCourseSearch:
    def test_course_search_success(self):
        """测试成功创建课程搜索模型"""
        search_data = {
            "Task": "ECE 602",
            "Term": "W2025",
            "Title": "Digital Systems"
        }
        search = CourseSearch(**search_data)
        assert search.Task == search_data["Task"]
        assert search.Term == search_data["Term"]
        assert search.Title == search_data["Title"]

    def test_course_search_with_none_values(self):
        """测试使用空值创建搜索模型"""
        search_data = {
            "Task": None,
            "Term": None,
            "Title": None
        }
        search = CourseSearch(**search_data)
        assert search.Task is None
        assert search.Term is None
        assert search.Title is None

    @pytest.mark.parametrize("search_data,expected_none_fields", [
        (
            {"Task": "ECE 602", "Term": None, "Title": None},
            ["Term", "Title"]
        ),
        (
            {"Task": None, "Term": "W2025", "Title": None},
            ["Task", "Title"]
        ),
        (
            {"Task": None, "Term": None, "Title": "Digital Systems"},
            ["Task", "Term"]
        ),
    ])
    def test_course_search_partial_values(self, search_data, expected_none_fields):
        """测试部分值搜索"""
        search = CourseSearch(**search_data)
        for field in expected_none_fields:
            assert getattr(search, field) is None

    @pytest.mark.parametrize("invalid_data,expected_error", [
        (
            {
                "Task": "ECE602",  # 无效格式
                "Term": "W2025",
                "Title": "Digital Systems"
            },
            "Invalid Task format"
        ),
        (
            {
                "Task": "ECE 602",
                "Term": "W025",   # 无效格式
                "Title": "Digital Systems"
            },
            "Invalid Term format"
        ),
        (
            {
                "Task": "ECE 602",
                "Term": "W2025",
                "Title": "@#$"    # 无效格式
            },
            "Invalid Title format"
        ),
    ])
    def test_course_search_validation_errors(self, invalid_data, expected_error):
        """测试搜索模型的验证约束"""
        with pytest.raises(ValidationError) as exc_info:
            CourseSearch(**invalid_data)
        assert expected_error in str(exc_info.value)