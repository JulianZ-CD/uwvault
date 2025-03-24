"use client";

import { useState, useEffect } from "react";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { MyUploadItem } from "./MyUploadItem";
import { Resource } from "@/app/types/resource";

export function MyUploadsList() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { getUserUploads, actions } = useResource();
  
  const [myUploads, setMyUploads] = useState<Resource[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 获取用户上传的资源
  useEffect(() => {
    if (!user || authLoading) return;

    const fetchMyUploads = async () => {
      setIsLoading(true);
      try {
        const result = await getUserUploads(pageSize, (page - 1) * pageSize);
        setMyUploads(result.items);
        setTotalItems(result.total);
      } catch (error) {
        console.error("Error fetching user uploads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyUploads();
  }, [user, authLoading, getUserUploads, page, pageSize]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (myUploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-primary/10 p-3 mb-4">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-medium">No uploads yet</h3>
        <p className="text-muted-foreground mt-1 mb-4">
          You haven't uploaded any resources yet.
        </p>
        {actions?.can_upload && (
          <Button onClick={() => router.push('/resources/upload')}>
            Upload Your First Resource
          </Button>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6 px-4">
      <div className="grid gap-4">
        {myUploads.map((resource) => (
          <MyUploadItem key={resource.id} resource={resource} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) handlePageChange(page - 1);
                  }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                
                // 调整页码显示逻辑，确保当前页在中间
                if (totalPages > 5) {
                  if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      href="#"
                      isActive={page === pageNum}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(pageNum);
                      }}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) handlePageChange(page + 1);
                  }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
