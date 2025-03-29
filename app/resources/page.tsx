"use client";

import { useState, useEffect, useRef } from "react";
import { ResourceList } from "@/app/resources/components/ResourceList";
import { MyUploadsList } from "@/app/resources/components/MyUploadsList";
import { ResourceTabs } from "@/app/resources/components/ResourceTabs";
import { Button } from "@/app/components/ui/button";
import { Upload, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth";

export default function ResourceListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { actions, fetchActions, isAdmin } = useResource();
  const [initializing, setInitializing] = useState(true);
  const pageInitialized = useRef(false);
  
  // read tab from URL query parameters
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'all' | 'myUploads'>(
    tabParam === 'myUploads' ? 'myUploads' : 'all'
  );

  useEffect(() => {
    setActiveTab(tabParam === 'myUploads' ? 'myUploads' : 'all');
  }, [tabParam]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) {
        return;
      }
      
      if (user && !pageInitialized.current) {
        pageInitialized.current = true;
        
        try {
          console.log("Initializing page and fetching actions...");
          await fetchActions();
        } catch (error) {
          console.error("Error fetching actions:", error);
        }
      }
      
      setInitializing(false);
    };
    
    init();
  }, [authLoading, user, fetchActions]);
  
  // handle tab change
  const handleTabChange = (tab: 'all' | 'myUploads') => {
    setActiveTab(tab);
    const url = `/resources${tab === 'myUploads' ? '?tab=myUploads' : ''}`;
    window.history.pushState({}, '', url);
  };
  
  // show loading state
  if (authLoading || initializing) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </main>
    );
  }

  // if admin, redirect to admin resource page
  if (user?.role === 'admin') {
    return (
      <main className="min-h-screen">
        <div className="container py-8">
          <div className="flex justify-between items-center mb-8 px-6">
            <h1 className="text-3xl font-bold">Resources</h1>
            <div className="flex gap-4">
              {actions?.can_upload && (
                <Button 
                  onClick={() => router.push("/resources/upload")}
                  className="gap-2"
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload New</span>
                </Button>
              )}
              <Button 
                onClick={() => router.push("/resources/admin")}
                variant="outline"
                className="gap-2"
              >
                <Settings className="h-5 w-5" />
                <span>Manage Resources</span>
              </Button>
            </div>
          </div>

          <ResourceTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {activeTab === 'all' ? (
            <ResourceList />
          ) : (
            <MyUploadsList />
          )}
        </div>
      </main>
    );
  }

  // normal user view
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

        {user && (
          <ResourceTabs activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {activeTab === 'all' ? (
          <ResourceList />
        ) : (
          <MyUploadsList />
        )}
      </div>
    </main>
  );
}