"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useResource } from "@/app/hooks/useResource";
import { ResourceCreateData, ResourceUpdateData } from "@/app/types/resource";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { useToast } from "@/app/hooks/use-toast";
import { Upload, X, Save, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/hooks/useAuth";

// 定义API错误类型
interface ApiError {
  status?: number;
  message?: string;
}

interface ResourceFormProps {
  courseId?: string;
  onSuccess?: () => void;
  onSubmit?: (data: ResourceCreateData | ResourceUpdateData) => Promise<void>;
  isLoading?: boolean;
  initialData: ResourceCreateData | ResourceUpdateData | null;
  resourceId?: number;
  currentFileName?: string;
}

export function ResourceForm({ 
  courseId, 
  onSuccess, 
  onSubmit, 
  isLoading = false, 
  initialData,
  resourceId,
  currentFileName
}: ResourceFormProps) {
  const { createResource, updateResource, isCreating, isUpdating, actions } = useResource();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [authError, setAuthError] = useState(false);
  const [fileChanged, setFileChanged] = useState(false);
  
  // 判断是否为编辑模式
  const isEditMode = !!initialData && !!resourceId;
  
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) {
        return;
      }
      
      if (!user) {
        setAuthError(true);
        return;
      }
      
      setAuthError(false);
    };
    
    checkAuth();
  }, [user, authLoading]);
  
  // 设置表单默认值
  const form = useForm<ResourceCreateData>({
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      course_id: initialData?.course_id || courseId || "",
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!['pdf', 'doc', 'docx'].includes(fileExt || '')) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Only PDF, DOC, and DOCX files are supported",
        });
        return;
      }
      
      setFile(selectedFile);
      setFileChanged(true);
      console.log("[ResourceForm] File selected:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        fileChanged: true
      });
    } else {
      console.log("[ResourceForm] File selection canceled");
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileChanged(true);
    console.log("[ResourceForm] File cleared, fileChanged set to true");
    
    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (data: Omit<ResourceCreateData, "file">) => {
    try {
      if (isEditMode && resourceId) {
        console.log("[ResourceForm] Updating resource:", {
          resourceId,
          fileChanged,
          hasFile: !!file,
          fileName: file?.name,
          fileSize: file?.size,
          formData: data
        });
        
        const updateData: ResourceUpdateData = {
          ...data,
          updated_by: user?.id || ""
        };
        
        if (fileChanged && file) {
          console.log("[ResourceForm] Including file in update:", file.name);
          updateData.file = file;
        } else {
          console.log("[ResourceForm] No file included in update. fileChanged:", fileChanged);
        }
        
        const updatedResource = await updateResource(resourceId, updateData);
        console.log("[ResourceForm] Resource updated successfully:", updatedResource);
        
        // 显示更新后的文件名
        if (updatedResource && fileChanged && file) {
          console.log("[ResourceForm] File updated to:", updatedResource.original_filename);
        }
        
        // 更新成功后，调用 onSuccess 回调
        if (onSuccess) {
          onSuccess();
        }
        
        // 更新成功后，重定向到 My Uploads 页面
        setTimeout(() => {
          router.push("/resources?tab=myUploads");
        }, 2000); // 2秒后重定向，给用户时间看到成功提示
        
      } else {
        // 创建模式
        if (!file) {
          toast({
            variant: "destructive",
            title: "File required",
            description: "Please select a file to upload",
          });
          return;
        }
        
        const createData: ResourceCreateData = {
          ...data,
          file
        };
        
        await createResource(createData);
        
        // 重置表单
        form.reset();
        clearFile();
        
        // 创建成功后，调用 onSuccess 回调，但不重定向
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("[ResourceForm] Error submitting form:", error);
      // 使用类型断言
      const apiError = error as ApiError;
      toast({
        variant: "destructive",
        title: `${isEditMode ? 'Update' : 'Upload'} failed`,
        description: apiError.message || `An error occurred while ${isEditMode ? 'updating' : 'uploading'} the resource`,
      });
    }
  };

  if (authError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="text-destructive text-xl mb-4">Authentication Required</div>
            <p className="text-muted-foreground mb-6">
              You need to be logged in to manage resources. Please sign in to continue.
            </p>
            <Button 
              onClick={() => router.push('/login')} 
              variant="default"
            >
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Update Resource' : 'Upload Resource'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Resource title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the resource" 
                      {...field} 
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Course ID" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              
              {/* 显示当前文件（编辑模式且未更改文件） */}
              {isEditMode && currentFileName && !fileChanged && (
                <div className="flex items-center justify-between p-2 border rounded-md mb-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{currentFileName}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* 显示新选择的文件（编辑模式且已更改文件） */}
              {isEditMode && fileChanged && file && (
                <div className="flex items-center justify-between p-2 border rounded-md mb-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{file.name} (New)</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* 显示已选择的文件（上传模式） */}
              {!isEditMode && file && (
                <div className="flex items-center justify-between p-2 border rounded-md mb-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* 文件选择器 */}
              <div className="relative">
                <Input
                  id="file"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-left font-normal"
                  onClick={() => document.getElementById('file')?.click()}
                >
                  {(!isEditMode && file) ? 'Change file' : 
                   (isEditMode ? 'Select new file (optional)' : 'Select file (PDF, DOC, DOCX only)')}
                </Button>
              </div>
              
              {form.formState.errors.file && (
                <p className="text-sm text-destructive">{form.formState.errors.file.message}</p>
              )}
            </div>

            <div className="flex justify-center">
              <Button 
                type="submit" 
                disabled={(isCreating || isUpdating) || (!isEditMode && !file)}
                className="px-6"
              >
                {(isCreating || isUpdating) ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                ) : (
                  <>
                    {isEditMode ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Submit
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Resource
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 