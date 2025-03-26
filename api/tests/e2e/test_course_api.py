import pytest
from api.services.user_course_service import UserCourse
from api.tests.factories import CourseSearchFactory
from api.models.course import CourseBase,CourseSearch
from fastapi import HTTPException


class TestUserCourseE2E:
    @pytest.fixture
    def user_course_service(self):
        return UserCourse()

    def test_find_course_with_all_parameters(self, user_course_service):
        """测试使用所有参数查找课程"""
        # 创建搜索参数
        search_params = CourseSearch(
            Task="ECE 602",
            Term="W2025",
            Title="Intro to Optimization"
        )
        
        results = user_course_service.find_course(search_params)
        
        assert isinstance(results, list)
        if len(results) > 0:
            for course in results:
                assert isinstance(course, CourseBase)
                assert hasattr(course, 'Task')
                assert hasattr(course, 'Term')
                assert hasattr(course, 'Title')

    def test_find_course_with_partial_parameters(self, user_course_service):
        search_params = CourseSearch(
            Task=None,
            Term="W2025",
            Title=None
        )
        
        results = user_course_service.find_course(search_params)
        
        assert isinstance(results, list)
        if len(results) > 0:
            for course in results:
                assert course.Term == "W2025"

    def test_find_course_with_partial_parameters(self, user_course_service):
        search_params = CourseSearch(
            Task=None,
            Term=None,
            Title=None
        )
        
        results = user_course_service.find_course(search_params)
        
        assert isinstance(results, list)
        assert len(results) > 0  # 应该返回所有课程

    def test_all_tasks(self, user_course_service):
        """测试获取所有任务类型"""
        results = user_course_service.all_tasks()
        
        assert isinstance(results, list)
        for task in results:
            assert isinstance(task, dict)
            assert "value" in task
            assert "label" in task
            assert task["value"] == task["label"]

    def test_all_terms(self, user_course_service):
        """测试获取所有学期"""
        results = user_course_service.all_terms()
        
        assert isinstance(results, list)
        for term in results:
            assert isinstance(term, dict)
            assert "value" in term
            assert "label" in term
            assert term["value"] == term["label"]

    def test_all_titles(self, user_course_service):
        """测试获取所有课程标题"""
        results = user_course_service.all_title()
        
        assert isinstance(results, list)
        for title in results:
            assert isinstance(title, dict)
            assert "value" in title
            assert "label" in title
            assert title["value"] == title["label"]

    @pytest.mark.parametrize("task,term,title", [
        ("ECE 602", "W2025", None),
        (None, "W2025", "RTL Digital Systems"),
        ("ECE 621", None, None),
        (None, None, "Database Systems"),
    ])
    def test_find_course_combinations(self, user_course_service, task, term, title):
        """测试不同参数组合的查找"""
        search_params = CourseSearch(
            Task=task,
            Term=term,
            Title=title
        )
        
        results = user_course_service.find_course(search_params)
        
        assert isinstance(results, list)
        for course in results:
            if task:
                assert course.Task == task
            if term:
                assert course.Term == term
            if title:
                assert course.Title == title

    def test_error_handling(self, user_course_service):
        """测试错误处理"""
        with pytest.raises(Exception):
            search_params = CourseSearch(
                Task="NonexistentTask",
                Term="InvalidTerm",
                Title="NonexistentTitle"
            )
            user_course_service.find_course(search_params)

    

    @pytest.fixture


    def test_performance(self, user_course_service):
        """测试性能"""
        import time
        start_time = time.time()
        
        search_params = CourseSearch(
            Task=None,
            Term=None,
            Title=None
        )
        results = user_course_service.find_course(search_params)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        assert execution_time < 2.0  # 确保执行时间在2秒内

    @pytest.mark.parametrize("task,term,title,expected_error", [
        ("ECE602", "W2025", "Test", "Invalid Task format"),  # Task 格式错误（缺少空格）
        ("ECE 602", "W025", "Test", "Invalid Term format"),  # Term 格式错误（年份不足4位）
        ("ECE 602", "X2025", "Test", "Invalid Term format"), # Term 格式错误（无效季节）
        ("ECE 602", "W2025", "@#$", "Invalid Title format"), # Title 格式错误
    ])
    def test_format_validation(self, user_course_service, task, term, title, expected_error):
        """测试输入格式验证"""
        with pytest.raises(HTTPException) as exc_info:
            search_params = CourseSearch(
                Task=task,
                Term=term,
                Title=title
            )
            user_course_service.find_course(search_params)
        
        assert exc_info.value.status_code == 400
        assert expected_error in str(exc_info.value.detail)

    def test_valid_formats(self, user_course_service):
        """测试有效的输入格式"""
        search_params = CourseSearch(
            Task="ECE 602",
            Term="W2025",
            Title="Digital Systems"
        )
        
        try:
            results = user_course_service.find_course(search_params)
            assert isinstance(results, list)
        except HTTPException:
            pytest.fail("Valid format raised an exception")