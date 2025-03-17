"use client";

import { ResourceForm } from "@/app/resources/components/ResourceForm";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useResource } from "@/app/hooks/useResource";
import { useEffect, useState } from "react";

export default function ResourceUploadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { actions, fetchActions } = useResource();
  const [initializing, setInitializing] = useState(true);
  
  // 初始化页面，获取权限
  useEffect(() => {
    const init = async () => {
      if (authLoading) {
        return; // 等待认证状态加载
      }
      
      if (!user) {
        // 未登录，重定向到登录页面
        router.push("/login");
        return;
      }
      
      try {
        // 获取权限
        await fetchActions();
        setInitializing(false);
      } catch (error) {
        console.error("Error initializing upload page:", error);
        setInitializing(false);
      }
    };
    
    init();
  }, [user, authLoading, fetchActions, router]);
  
  // 显示加载状态
  if (initializing || authLoading) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen">
      <div className="container py-8">
        <ResourceForm 
          onSuccess={() => {
            router.push("/resources");
          }}
          initialData={null}
        />
      </div>
    </main>
  );
}