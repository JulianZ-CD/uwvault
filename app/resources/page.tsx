"use client";

import { useState, useEffect } from "react";
import { ResourceList } from "@/app/resources/components/ResourceList";
import { Button } from "@/app/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";

export default function ResourceListPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/py/resources/actions/', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setIsAuthenticated(response.status !== 401 && response.status !== 403);
      } catch (error) {
        console.error("Error checking auth:", error);
        // 网络错误不应该导致认为用户未登录
        setIsAuthenticated(true);
      }
    };
    
    checkAuth();
  }, []);
  
  if (isAuthenticated === null) {
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
          {isAuthenticated && (
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