"use client";

import { useState } from "react";
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

interface ResourceFormProps {
  courseId?: string;
  onSuccess?: () => void;
  onSubmit?: (data: ResourceCreateData) => Promise<void>;
  isLoading?: boolean;
  initialData: ResourceCreateData | null;
}

export function ResourceForm({ courseId, onSuccess, onSubmit, isLoading = false, initialData }: ResourceFormProps) {
  const { createResource, isCreating } = useResource();
  const { toast } = useToast();
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  
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
    }
  };

  const clearFile = () => {
    setFile(null);
    // Reset the file input
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
          
          form.reset();
          setFile(null);
          
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload resource",
      });
    }
  };

  const fileValue = form.watch("file") as unknown as FileList;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Resource</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              rules={{ required: "Title is required" }}
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
                      placeholder="Describe this resource (optional)" 
                      className="resize-none" 
                      {...field} 
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