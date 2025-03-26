import pytest
from fastapi import status
from api.tests.factories import CourseSearchFactory
from api.services.user_course_service import UserCourse

@pytest.mark.integration
class TestCourseRouter:
    BASE_URL="/api/py/course"
    
    @pytest.fixture(autouse=True)

    def test_get_all_class(self, test_client):
        """测试获取所有课程"""
        # Act
        response = test_client.get(f"{self.BASE_URL}/allclass")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert all(isinstance(course, dict) for course in data)
            assert all("Task" in course for course in data)
            assert all("Term" in course for course in data)
            assert all("Title" in course for course in data)

    def test_find_course(self, test_client):
        """测试查找课程"""
        # Arrange
        search_params = {
            "Task": "ECE 602",
            "Term": "W2025",
            "Title": "Intro to Optimization"
        }

        # Act
        response = test_client.post(f"{self.BASE_URL}/findclass", json=search_params)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_find_course_with_partial_params(self, test_client):
        """测试使用部分参数查找课程"""
        # Arrange
        search_params = {
            "Task": None,
            "Term": "W2025",
            "Title": None
        }

        # Act
        response = test_client.post(f"{self.BASE_URL}/findclass", json=search_params)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert all(course["Term"] == "W2025" for course in data)

    def test_all_tasks(self, test_client):
        """测试获取所有任务类型"""
        # Act
        response = test_client.post(f"{self.BASE_URL}/findtask")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        for task in data:
            assert "value" in task
            assert "label" in task
            assert task["value"] == task["label"]

    def test_all_terms(self, test_client):
        """测试获取所有学期"""
        # Act
        response = test_client.post(f"{self.BASE_URL}/findterm")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        for term in data:
            assert "value" in term
            assert "label" in term
            assert term["value"] == term["label"]

    def test_all_titles(self, test_client):
        """测试获取所有课程标题"""
        # Act
        response = test_client.post(f"{self.BASE_URL}/findtitle")

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        for title in data:
            assert "value" in title
            assert "label" in title
            assert title["value"] == title["label"]

    @pytest.mark.parametrize("task,term,title", [
        ("ECE 602", "W2025", None),
        (None, "W2025", "RTL Digital Systems"),
        ("ECE 621", None, None),
        (None, None, "Database Systems"),
    ])
    def test_find_course_combinations(self, test_client, task, term, title):
        """测试不同参数组合的查找"""
        # Arrange
        search_params = {
            "Task": task,
            "Term": term,
            "Title": title
        }

        # Act
        response = test_client.post(f"{self.BASE_URL}/findclass", json=search_params)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_invalid_format_handling(self, test_client):
        """测试无效格式处理"""
        # Arrange
        invalid_params = [
            {"Task": "ECE602", "Term": "W2025", "Title": "Test"},  # 无效的Task格式
            {"Task": "ECE 602", "Term": "W025", "Title": "Test"},  # 无效的Term格式
            {"Task": "ECE 602", "Term": "X2025", "Title": "Test"}, # 无效的Term格式
            {"Task": "ECE 602", "Term": "W2025", "Title": "@#$"}   # 无效的Title格式
        ]

        for params in invalid_params:
            # Act
            response = test_client.post(f"{self.BASE_URL}/findclass", json=params)

            # Assert
            assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_error_handling_invalid_params(self, test_client):
        """测试无效参数的错误处理"""
        # 测试无效的搜索参数
        invalid_params = {
            "Task": "NonexistentTask",
            "Term": "InvalidTerm",
            "Title": "NonexistentTitle"
        }
        response = test_client.post(f"{self.BASE_URL}/findclass", json=invalid_params)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_error_handling_invalid_format(self, test_client):
        """测试无效格式的错误处理"""
        invalid_format = {
            "Task": "ECE602",  # 缺少空格
            "Term": "W2025",
            "Title": "Test"
        }
        response = test_client.post(f"{self.BASE_URL}/findclass", json=invalid_format)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_all_class(self, test_client):
        """测试更新所有课程"""
        response = test_client.post(f"{self.BASE_URL}/updateallclass")
        assert response.status_code in [
            status.HTTP_200_OK,          # 成功
            status.HTTP_404_NOT_FOUND    # 未找到
        ]

    @pytest.mark.parametrize("invalid_params,expected_status", [
        (
            {"Task": "ECE602", "Term": "W2025", "Title": "Test"},
            status.HTTP_400_BAD_REQUEST
        ),
        (
            {"Task": "ECE 602", "Term": "W025", "Title": "Test"},
            status.HTTP_400_BAD_REQUEST
        ),
        (
            {"Task": "ECE 602", "Term": "X2025", "Title": "Test"},
            status.HTTP_400_BAD_REQUEST
        ),
    ])
    def test_various_error_cases(self, test_client, invalid_params, expected_status):
        """测试各种错误情况"""
        response = test_client.post(
            f"{self.BASE_URL}/findclass",
            json=invalid_params
        )
        assert response.status_code == expected_status

    def test_missing_required_fields(self, test_client):
        """测试缺少必需字段"""
        incomplete_params = {
            "Task": "ECE 602"
            # 缺少 Term 和 Title
        }
        response = test_client.post(
            f"{self.BASE_URL}/findclass",
            json=incomplete_params
        )
        assert response.status_code == status.HTTP_200_OK

    def test_server_error_handling(self, test_client):
        """测试服务器错误处理"""
        # 这里可以测试一些可能导致 500 错误的情况
        # 例如，数据库连接问题等
        pass

    def test_performance(self, test_client):
        """测试性能"""
        import time
        
        # 测试获取所有课程的响应时间
        start_time = time.time()
        response = test_client.get(f"{self.BASE_URL}/allclass")
        end_time = time.time()
        
        assert response.status_code == status.HTTP_200_OK
        assert (end_time - start_time) < 2.0  # 确保响应时间在2秒内