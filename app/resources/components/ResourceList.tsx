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

  // handle filter - only receive course ID
  const handleFilter = (course_id?: string) => {
    console.log(`ResourceList - Filtering resources with course_id: ${course_id ? `"${course_id}"` : 'undefined (all courses)'}`);
    setCourseId(course_id); 
    setPage(1); 
    
    // re-fetch resources
    if (user) {
      fetchResources({ 
        limit: pageSize, 
        offset: 0,
        course_id: course_id
      }).then(() => {
        console.log("Resources fetched successfully after filter");
      }).catch(error => {
        console.error("Error fetching filtered resources:", error);
      });
    }
  };

  // when authentication status changes, reset state and handle redirection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

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

  // when page changes, get new resources
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

  // handle rating update
  const handleRatingUpdate = (resourceId: number, averageRating: number, ratingCount: number) => {
    const updatedResources = resources.map(resource => 
      resource.id === resourceId 
        ? { 
            ...resource, 
            average_rating: averageRating, 
            rating_count: ratingCount 
          } 
        : resource
    );
    
    console.log(`Rating updated for resource ${resourceId}: ${averageRating} (${ratingCount} ratings)`);
  };

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