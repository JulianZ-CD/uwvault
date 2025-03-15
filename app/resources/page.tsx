"use client";

import { useState, useEffect } from "react";
import { ResourceList } from "@/app/resources/components/ResourceList";
import { Button } from "@/app/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth"; // 使用统一的auth hook

export default function ResourceListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth(); // 使用统一的auth hook
  const { actions, fetchActions } = useResource();
  const [initializing, setInitializing] = useState(true);
  
  useEffect(() => {
    // 统一认证状态检查
    const init = async () => {
      if (authLoading) {
        // 等待认证状态加载
        return;
      }
      
      if (user) {
        // 用户已登录，获取权限
        try {
          await fetchActions();
        } catch (error) {
          console.error("Error fetching actions:", error);
        }
      }
      
      setInitializing(false);
    };
    
    init();
  }, [authLoading, user, fetchActions]);
  
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

        <ResourceList />
      </div>
    </main>
  );
}