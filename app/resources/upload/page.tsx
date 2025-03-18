"use client";

import { ResourceForm } from "@/app/resources/components/ResourceForm";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useState, useEffect } from "react";
import { useToast } from "@/app/hooks/use-toast";

export default function ResourceUploadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();
  
  // 初始化页面，只检查用户是否登录
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // 未登录，重定向到登录页面
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please login to upload resources",
        });
        router.push("/login");
        return;
      }
      
      // 用户已登录，可以上传
      setInitializing(false);
    }
  }, [user, authLoading, router, toast]);
  
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