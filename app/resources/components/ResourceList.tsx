"use client";

import { useState, useEffect } from "react";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";
import { useToast } from "@/app/hooks/use-toast";
import { ResourceItem } from "@/app/resources/components/ResourceItem";
import { ResourceFilter } from "@/app/resources/components/ResourceFilter";
import { useRouter } from "next/navigation";

export function ResourceList() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    resources, 
    totalItems, 
    isLoading, 
    fetchResources
  } = useResource();
  
  const [page, setPage] = useState(1);
  const [authError, setAuthError] = useState(false);
  const pageSize = 10;
  const { toast } = useToast();
  const [resourcesFetched, setResourcesFetched] = useState(false);
  
  // Store the current courseId for tracking selection
  const [courseId, setCourseId] = useState<string | undefined>(undefined);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 处理过滤 - 只接收课程ID
  const handleFilter = (course_id?: string) => {
    console.log(`ResourceList - Filtering resources with course_id: ${course_id ? `"${course_id}"` : 'undefined (all courses)'}`);
    setCourseId(course_id); // 现在可以接受 undefined
    setPage(1); // 重置到第一页
    
    // 重新获取资源
    if (user) {
      fetchResources({ 
        limit: pageSize, 
        offset: 0,
        course_id: course_id // 直接传递 course_id，可能是 undefined
      }).then(() => {
        console.log("Resources fetched successfully after filter");
      }).catch(error => {
        console.error("Error fetching filtered resources:", error);
      });
    }
  };

  // 当认证状态改变时，重置状态并处理重定向
  useEffect(() => {
    if (!authLoading && !user) {
      // 用户未登录，直接重定向到登录页面
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 分离资源获取逻辑
  useEffect(() => {
    // 仅在认证完成且用户已登录的情况下获取资源
    if (authLoading || !user) {
      return;
    }

    // 避免重复获取资源
    if (resourcesFetched) {
      return;
    }
    
    console.log("User is logged in, fetching resources...");
    setResourcesFetched(true);
    
    fetchResources({ 
      limit: pageSize, 
      offset: (page - 1) * pageSize,
      course_id: courseId
    })
      .catch(error => {
        console.error("Error fetching resources:", error);
        if (error.status === 401 || error.status === 403) {
          setAuthError(true);
        }
      });
  }, [user, authLoading, fetchResources, pageSize, page, resourcesFetched, courseId]);

  // 当页码变化时获取新资源
  useEffect(() => {
    if (!user || authLoading || !resourcesFetched) return;

    console.log(`Fetching resources for page ${page} with filter - course_id: "${courseId || 'all'}"`);
    fetchResources({ 
      limit: pageSize, 
      offset: (page - 1) * pageSize,
      course_id: courseId
    })
      .catch(error => {
        console.error("Error fetching resources after page change:", error);
      });
  }, [page, user, authLoading, resourcesFetched, fetchResources, pageSize, courseId]);

  // 处理评分更新
  const handleRatingUpdate = (resourceId: number, averageRating: number, ratingCount: number) => {
    // 更新资源列表中的评分信息
    const updatedResources = resources.map(resource => 
      resource.id === resourceId 
        ? { 
            ...resource, 
            average_rating: averageRating, 
            rating_count: ratingCount 
          } 
        : resource
    );
    
    // 这里我们不直接更新resources状态，因为它由useResource管理
    // 但在实际应用中，您可能需要更新本地状态或触发重新获取
    console.log(`Rating updated for resource ${resourceId}: ${averageRating} (${ratingCount} ratings)`);
  };

  // 如果正在加载认证状态或资源，显示加载指示器
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6 px-4">
      {/* Pass the current courseId to ResourceFilter */}
      <ResourceFilter 
        onFilter={handleFilter} 
        selectedCourseId={courseId ? courseId : "all"} 
      />
      
      <div className="grid gap-4">
        {resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No resources found.
          </div>
        ) : (
          resources.map((resource) => (
            <ResourceItem 
              key={resource.id} 
              resource={resource} 
              onRatingUpdate={handleRatingUpdate}
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