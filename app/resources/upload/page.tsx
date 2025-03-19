"use client";

import { ResourceForm } from "@/app/resources/components/ResourceForm";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/app/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export default function ResourceUploadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const formKey = useRef(0); // 用于重置表单的key
  
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
  
  const handleUploadSuccess = () => {
    // 显示成功提示
    setShowSuccessAlert(true);
    
    // 重置表单 (通过改变key强制重新渲染)
    formKey.current += 1;
    
    // 5秒后自动隐藏成功提示
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 5000);
  };
  
  return (
    <main className="min-h-screen">
      <div className="container py-8">
        {showSuccessAlert && (
          <Alert className="mb-6 border-green-500 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Upload Successful</AlertTitle>
            <AlertDescription>
              Your resource has been uploaded successfully and is pending review.
            </AlertDescription>
          </Alert>
        )}
        
        <ResourceForm 
          key={formKey.current}
          onSuccess={handleUploadSuccess}
          initialData={null}
        />
      </div>
    </main>
  );
}