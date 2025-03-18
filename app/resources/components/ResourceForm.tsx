"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useResource } from "@/app/hooks/useResource";
import { ResourceCreateData } from "@/app/types/resource";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { useToast } from "@/app/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/app/components/ui/label";
import { useWatch } from "react-hook-form";
import { useAuth } from "@/app/hooks/useAuth";

// 定义API错误类型
interface ApiError {
  status?: number;
  message?: string;
}

interface ResourceFormProps {
  courseId?: string;
  onSuccess?: () => void;
  onSubmit?: (data: ResourceCreateData) => Promise<void>;
  isLoading?: boolean;
  initialData: ResourceCreateData | null;
}

export function ResourceForm({ courseId, onSuccess, onSubmit, isLoading = false, initialData }: ResourceFormProps) {
  const { createResource, isCreating, actions, fetchActions } = useResource();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [authError, setAuthError] = useState(false);
  
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
  
  const form = useForm<ResourceCreateData>({
    defaultValues: {
      title: "",
      description: "",
      course_id: courseId || "",
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

      console.log("File selected:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      }); 
    }
  };

  const clearFile = () => {
    setFile(null);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (data: Omit<ResourceCreateData, "file">) => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "File required",
        description: "Please select a file to upload",
      });
      return;
    }

    try {
      const resourceData: ResourceCreateData = {
        ...data,
        file
      };

      if (onSubmit) {
        await onSubmit(resourceData);
      } else {
        const result = await createResource(resourceData);
        if (result) {
          toast({
            title: "Success",
            description: "Resource uploaded successfully",
          });
          
          if (onSuccess) {
            onSuccess();
          } else {
            router.push("/resources");
          }
        }
      }
    } catch (error) {
      console.error("Error uploading resource:", error);
      // 使用类型断言
      const apiError = error as ApiError;
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: apiError.message || "An error occurred while uploading the resource",
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
              You need to be logged in to upload resources. Please sign in to continue.
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
        <CardTitle>Upload Resource</CardTitle>
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
                  {file?.name || 'Select file (PDF, DOC, DOCX only)'}
                </Button>
              </div>
              {form.formState.errors.file && (
                <p className="text-sm text-destructive">{form.formState.errors.file.message}</p>
              )}
            </div>

            <div className="flex justify-center">
              <Button 
                type="submit" 
                disabled={isCreating || !file}
                className="px-6"
              >
                {isCreating ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resource
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