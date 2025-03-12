// app/resources/components/ResourceFilter.tsx
"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Search } from "lucide-react";

interface ResourceFilterProps {
  onFilter: (search: string, courseId?: string) => void;
}

export function ResourceFilter({ onFilter }: ResourceFilterProps) {
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter(search, courseId || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="flex-1">
        <Input
          placeholder="搜索资源..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="w-full sm:w-1/3">
        <Input
          placeholder="课程ID (可选)"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        />
      </div>
      <Button type="submit">
        <Search className="h-4 w-4 mr-2" />
        搜索
      </Button>
    </form>
  );
}