// app/resources/components/ResourceFilter.tsx
"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useAuth } from "@/app/hooks/useAuth";
import { useResource } from "@/app/hooks/useResource";

interface ResourceFilterProps {
  onFilter: (courseId?: string) => void;
}

export function ResourceFilter({ onFilter }: ResourceFilterProps) {
  const [courseId, setCourseId] = useState("all");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { getCourseIds } = useResource();

  // 获取所有课程ID
  useEffect(() => {
    const fetchCourseIds = async () => {
      if (!user) return; // 确保用户已登录
      
      setLoading(true);
      try {
        const ids = await getCourseIds();
        setCourseIds(ids.filter(id => id && id.trim() !== ''));
      } catch (error) {
        console.error("Error fetching course IDs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseIds();
  }, [user, getCourseIds]);

  // 处理课程选择变化
  const handleCourseChange = (value: string) => {
    console.log("Selected course ID:", value);
    setCourseId(value);
    
    // 课程变化时立即触发过滤
    // 明确传递 undefined 而不是空字符串，确保 API 调用正确
    onFilter(value === "all" ? undefined : value);
  };

  return (
    <div className="mb-6">
      <div className="max-w-xs">
        <Select 
          value={courseId} 
          onValueChange={handleCourseChange}
          defaultValue="all"
        >
          <SelectTrigger className={loading ? "opacity-70" : ""}>
            <SelectValue placeholder="Select Course ID">
              {courseId === "all" ? "All Courses" : courseId}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courseIds.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}