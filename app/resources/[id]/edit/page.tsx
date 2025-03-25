"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResourceForm } from "@/app/resources/components/ResourceForm";
import { useResource } from "@/app/hooks/useResource";
import { useToast } from "@/app/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { Resource, ResourceUpdateData } from "@/app/types/resource";

export default function ResourceEditPage() {
  const params = useParams();
  const router = useRouter();
  const { getResource, isLoading: resourceLoading } = useResource();
  const { toast } = useToast();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [formKey, setFormKey] = useState(0);
  
  // 获取资源详情
  useEffect(() => {
    const fetchResource = async () => {
      try {
        const id = Number(params.id);
        if (isNaN(id)) {
          toast({
            variant: "destructive",
            title: "Invalid resource ID",
            description: "The resource ID is not valid."
          });
          router.push("/resources");
          return;
        }
        
        const resourceData = await getResource(id);
        setResource(resourceData);
      } catch (error) {
        console.error("Error fetching resource:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load resource details."
        });
        router.push("/resources");
      } finally {
        setLoading(false);
      }
    };
    
    fetchResource();
  }, [params.id, getResource, toast, router]);
  
  // 准备表单初始数据
  const getInitialData = (): ResourceUpdateData => {
    if (!resource) return {};
    
    return {
      title: resource.title,
      description: resource.description || "",
      course_id: resource.course_id || ""
    };
  };
  
  // 处理更新成功
  const handleUpdateSuccess = () => {
    setShowSuccessAlert(true);
    
    // 5秒后隐藏成功提示
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 5000);
    
    // 重置表单
    setFormKey(prev => prev + 1);
  };
  
  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </main>
    );
  }
  
  if (!resource) {
    return (
      <main className="min-h-screen">
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Resource Not Found</h1>
            <p className="text-muted-foreground mb-6">The resource you are looking for does not exist or has been removed.</p>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen">
      <div className="container py-8">
        {showSuccessAlert && (
          <Alert className="mb-6 border-green-500 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Update Successful</AlertTitle>
            <AlertDescription>
              Your resource has been updated successfully.
            </AlertDescription>
          </Alert>
        )}
        
        <ResourceForm 
          key={formKey}
          initialData={getInitialData()}
          resourceId={Number(params.id)}
          currentFileName={resource.original_filename}
          onSuccess={handleUpdateSuccess}
        />
      </div>
    </main>
  );
}
