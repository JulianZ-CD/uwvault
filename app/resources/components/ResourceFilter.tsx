// app/resources/components/ResourceFilter.tsx
"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useAuth } from "@/app/hooks/useAuth";
import { useResource } from "@/app/hooks/useResource";

interface ResourceFilterProps {
  onFilter: (courseId?: string) => void;
  selectedCourseId?: string; // Add selectedCourseId prop
}

export function ResourceFilter({ onFilter, selectedCourseId = "all" }: ResourceFilterProps) {
  const [courseId, setCourseId] = useState(selectedCourseId);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const { user } = useAuth();
  const { getCourseIds } = useResource();

  // Update local state when prop changes
  useEffect(() => {
    setCourseId(selectedCourseId);
  }, [selectedCourseId]);

  // get all course IDs
  useEffect(() => {
    const fetchCourseIds = async () => {
      if (!user) return; // ensure user is logged in
      
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

  // handle course selection change
  const handleCourseChange = (value: string) => {
    console.log("Selected course ID:", value);
    setCourseId(value);
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
            <SelectValue placeholder={loading ? "Loading courses..." : "Select Course ID"}>
              {loading ? "Loading courses..." : 
               courseId === "all" ? "All Courses" : courseId}
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