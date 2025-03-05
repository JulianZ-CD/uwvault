"use client";

import { ResourceForm } from "@/app/components/resource/ResourceForm";
import { useRouter } from "next/navigation";

export default function ResourceUploadPage() {
  const router = useRouter();

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