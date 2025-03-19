"use client";

import { useState, useEffect, useRef } from "react";
import { ResourceList } from "@/app/resources/components/ResourceList";
import { MyUploadsList } from "@/app/resources/components/MyUploadsList";
import { ResourceTabs } from "@/app/resources/components/ResourceTabs";
import { Button } from "@/app/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth";

export default function ResourceListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { actions, fetchActions } = useResource();
  const [initializing, setInitializing] = useState(true);
  const pageInitialized = useRef(false);
  const [activeTab, setActiveTab] = useState<'all' | 'myUploads'>('all');

  useEffect(() => {
    // 统一认证状态检查
    const init = async () => {
      if (authLoading) {
        // 等待认证状态加载
        return;
      }
      
      if (user && !pageInitialized.current) {
        pageInitialized.current = true; // 标记页面已初始化
        
        // 用户已登录，获取权限（仅在首次加载时执行）
        try {
          console.log("Initializing page and fetching actions...");
          await fetchActions();
        } catch (error) {
          console.error("Error fetching actions:", error);
        }
      }
      
      setInitializing(false);
    };
    
    init();
  }, [authLoading, user, fetchActions]);
  
  // 处理标签切换
  const handleTabChange = (tab: 'all' | 'myUploads') => {
    setActiveTab(tab);
  };
  
  // 显示加载状态
  if (authLoading || initializing) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8 px-6">
          <h1 className="text-3xl font-bold">Resources</h1>
          {user && actions?.can_upload && (
            <Button 
              onClick={() => router.push("/resources/upload")}
              className="gap-2"
            >
              <Upload className="h-5 w-5" />
              <span>Upload New</span>
            </Button>
          )}
        </div>

        {user && (
          <ResourceTabs activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {activeTab === 'all' ? (
          <ResourceList />
        ) : (
          <MyUploadsList />
        )}
      </div>
    </main>
  );
}