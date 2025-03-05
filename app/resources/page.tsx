"use client";

import { ResourceList } from "@/app/components/resource/ResourceList";
import { Button } from "@/app/components/ui/button";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResourceListPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8 px-6">
          <h1 className="text-3xl font-bold">Resources</h1>
          <Button 
            onClick={() => router.push("/resources/upload")}
            className="gap-2"
          >
            <Upload className="h-5 w-5" />
            <span>Upload New</span>
          </Button>
        </div>

        <ResourceList />
      </div>
    </main>
  );
} 