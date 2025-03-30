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
  const formKey = useRef(0); 
  
  // initialize page, only check if user is logged in
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please login to upload resources",
        });
        router.push("/login");
        return;
      }
      
      setInitializing(false);
    }
  }, [user, authLoading, router, toast]);
  
  // show loading state
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
    setShowSuccessAlert(true);
    formKey.current += 1;
    
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