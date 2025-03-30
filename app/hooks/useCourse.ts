import { useState, useEffect } from "react";
import { Course } from "@/app/types/course";
import { courseService } from "@/app/services/courseService";
import { useAuth } from "./useAuth";

export function useCourse() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await courseService.getAllCourse();
      setCourses(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  return {
    courses,
    isLoading,
    error,
    fetchCourses,
  };
} 