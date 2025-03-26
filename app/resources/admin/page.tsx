"use client";

import { useState, useEffect } from "react";
import { AdminResourceList } from "@/app/resources/components/AdminResourceList";
import { Button } from "@/app/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { ResourceStatus } from "@/app/types/resource";
import { ResourceFilter } from "@/app/resources/components/ResourceFilter";

export default function AdminResourcePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  
  // check user permission
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/resources');
    }
  }, [user, authLoading, router]);
  
  // handle filter
  const handleFilter = (course_id?: string) => {
    setCourseId(course_id);
  };
  
  if (authLoading) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </main>
    );
  }
  
  if (!user || user.role !== 'admin') {
    return null; 
  }
  
  return (
    <main className="min-h-screen">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8 px-4">
          <h1 className="text-3xl font-bold">Resource Management</h1>
          <Button 
            onClick={() => router.push("/resources/upload")}
            className="gap-2"
          >
            <Upload className="h-5 w-5" />
            <span>Upload New</span>
          </Button>
        </div>
        
        <div className="mb-6 px-4">
          <ResourceFilter onFilter={handleFilter} />
        </div>
        
        <AdminResourceList 
          courseId={courseId}
          showRatings={true}
        />
      </div>
    </main>
  );
}
