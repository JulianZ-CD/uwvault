"use client";

import { useState, useEffect } from "react";
import { useResource } from "@/app/hooks/useResource";
import { ResourceStatus } from "@/app/types/resource";
import { AdminResourceItem } from "@/app/resources/components/AdminResourceItem";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";
import { useToast } from "@/app/hooks/use-toast";

interface AdminResourceListProps {
  status?: ResourceStatus;
  search?: string;
  courseId?: string;
  showRatings?: boolean;
}

export function AdminResourceList({ 
  status, 
  search, 
  courseId,
  showRatings = false
}: AdminResourceListProps) {
  const { resources, totalItems, isLoading, fetchResources } = useResource();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  
  useEffect(() => {
    const loadResources = async () => {
      try {
        const params: {
          limit: number;
          offset: number;
          course_id?: string;
          search?: string;
          status?: string;
          is_admin: boolean;
        } = {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          is_admin: true
        };
        
        if (courseId) params.course_id = courseId;
        if (search) params.search = search;
        if (status) params.status = status.toString();
        
        await fetchResources(params);
      } catch (error) {
        console.error("Error fetching resources:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load resources."
        });
      }
    };
    
    loadResources();
  }, [fetchResources, page, status, search, courseId, toast]);
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return (
    <div className="space-y-6 px-4">
      <div className="grid gap-4">
        {resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No resources found.
          </div>
        ) : (
          resources.map((resource) => (
            <AdminResourceItem 
              key={resource.id} 
              resource={resource}
              showRating={showRatings}
            />
          ))
        )}
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
              
              {/* 添加页码数字 */}
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