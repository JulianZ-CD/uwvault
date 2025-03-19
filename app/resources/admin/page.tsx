"use client";

import { useState, useEffect } from "react";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth";
import { ResourceStatus } from "@/app/types/resource";
import { AdminResourceList } from "@/app/resources/components/AdminResourceList";
import { ResourceFilter } from "@/app/resources/components/ResourceFilter";
import { useToast } from "@/app/hooks/use-toast";
import { useRouter } from "next/navigation";

// 创建一个简单的管理员标签页组件
interface AdminResourceTabsProps {
  activeTab: 'pending' | 'all';
  onTabChange: (tab: 'pending' | 'all') => void;
}

function AdminResourceTabs({ activeTab, onTabChange }: AdminResourceTabsProps) {
  return (
    <div className="flex border-b mb-6">
      <button 
        className={`px-4 py-2 ${activeTab === 'pending' ? 'border-b-2 border-primary font-medium' : ''}`}
        onClick={() => onTabChange('pending')}
      >
        Pending Resources
      </button>
      <button 
        className={`px-4 py-2 ${activeTab === 'all' ? 'border-b-2 border-primary font-medium' : ''}`}
        onClick={() => onTabChange('all')}
      >
        All Resources
      </button>
    </div>
  );
}

export default function AdminResourcesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  
  // 检查管理员权限
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page.",
      });
      router.push("/resources");
    }
  }, [user, authLoading, router, toast]);
  
  const handleFilter = (searchText: string, course?: string) => {
    setSearch(searchText);
    setCourseId(course);
  };
  
  const handleTabChange = (tab: 'pending' | 'all') => {
    setActiveTab(tab);
  };
  
  if (authLoading || !user) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Resource Management</h1>
      
      <AdminResourceTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      <ResourceFilter onFilter={handleFilter} />
      
      {activeTab === 'pending' && (
        <AdminResourceList 
          status={ResourceStatus.PENDING}
          search={search}
          courseId={courseId}
        />
      )}
      
      {activeTab === 'all' && (
        <AdminResourceList 
          status={undefined}
          search={search}
          courseId={courseId}
          showRatings={true}
        />
      )}
    </div>
  );
}
