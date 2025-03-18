"use client";

import { useState, useEffect } from "react";
import { useResource } from "@/app/hooks/useResource";
import { useAuth } from "@/app/hooks/useAuth";
import { ResourceListParams, ResourceRating } from "@/app/types/resource";
import { Card, CardHeader, CardTitle, CardFooter } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Download } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/app/components/ui/pagination";
import { useToast } from "@/app/hooks/use-toast";
import { ResourceActions } from "@/app/resources/components/ResourceActions";
import { StarRating } from "@/app/components/ui/star-rating";

export function ResourceList() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    resources, 
    totalItems, 
    isLoading, 
    fetchResources, 
    rateResource, 
    getUserRating 
  } = useResource();
  
  const [page, setPage] = useState(1);
  const [authError, setAuthError] = useState(false);
  const pageSize = 10;
  const { toast } = useToast();
  const [resourcesFetched, setResourcesFetched] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<number, ResourceRating>>({});
  const [ratingLoading, setRatingLoading] = useState<number | null>(null);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 当认证状态改变时，重置状态
  useEffect(() => {
    if (!authLoading && !user) {
      setAuthError(true);
    } else if (user) {
      setAuthError(false);
    }
  }, [user, authLoading]);

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
    
    fetchResources({ limit: pageSize, offset: (page - 1) * pageSize })
      .catch(error => {
        console.error("Error fetching resources:", error);
        if (error.status === 401 || error.status === 403) {
          setAuthError(true);
        }
      });
  }, [user, authLoading, fetchResources, pageSize, page, resourcesFetched]);

  // 当页码变化时获取新资源
  useEffect(() => {
    if (!user || authLoading || !resourcesFetched) return;

    console.log(`Fetching resources for page ${page}...`);
    fetchResources({ limit: pageSize, offset: (page - 1) * pageSize })
      .catch(error => {
        console.error("Error fetching resources after page change:", error);
      });
  }, [page, user, authLoading, resourcesFetched, fetchResources, pageSize]);

  // 获取用户对资源的评分
  useEffect(() => {
    if (!user || resources.length === 0) return;

    const fetchRatings = async () => {
      const ratings: Record<number, ResourceRating> = {};
      
      for (const resource of resources) {
        try {
          const rating = await getUserRating(resource.id);
          if (rating) {
            ratings[resource.id] = rating;
          }
        } catch (error) {
          console.error(`Error fetching rating for resource ${resource.id}:`, error);
        }
      }
      
      setUserRatings(ratings);
    };

    fetchRatings();
  }, [resources, getUserRating, user]);

  // 处理评分
  const handleRate = async (resourceId: number, rating: number) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "You need to be logged in to rate resources."
      });
      return;
    }

    setRatingLoading(resourceId);
    
    try {
      const result = await rateResource(resourceId, rating);
      if (result) {
        setUserRatings(prev => ({
          ...prev,
          [resourceId]: result
        }));
        
        // 更新资源列表中的评分信息
        const updatedResources = resources.map(resource => 
          resource.id === resourceId 
            ? { 
                ...resource, 
                average_rating: result.average_rating, 
                rating_count: result.rating_count 
              } 
            : resource
        );
        
        toast({
          title: "Rating Submitted",
          description: "Thank you for rating this resource!",
          className: "border-green-500 text-green-700",
        });
      }
    } catch (error) {
      console.error("Error rating resource:", error);
      toast({
        variant: "destructive",
        title: "Rating Failed",
        description: "Failed to submit your rating. Please try again."
      });
    } finally {
      setRatingLoading(null);
    }
  };

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-destructive text-xl mb-4">Authentication Required</div>
        <p className="text-muted-foreground mb-6">
          You need to be logged in to view resources. Please sign in to continue.
        </p>
        <Button 
          onClick={() => window.location.href = '/login'} 
          variant="default"
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (isLoading || (authLoading && !resources.length)) {
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
        {resources.map((resource) => (
          <Card key={resource.id} className="hover:bg-accent/5 transition-colors">
            <CardHeader className="flex flex-row items-start space-y-0 pb-2 px-6">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center">
                  <CardTitle className="text-xl max-w-[50%]">
                    <span className="text-primary/80">{resource.course_id || 'N/A'}</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span>{resource.title}</span>
                  </CardTitle>
                  
                  <div className="flex-1 flex justify-end pr-8">
                    <StarRating 
                      rating={resource.average_rating} 
                      readOnly={true}
                      size={20}
                      ratingCount={resource.rating_count}
                    />
                  </div>
                  
                  <ResourceActions 
                    resourceId={resource.id}
                    fileType={resource.file_type}
                  />
                </div>
                
                <div className="flex items-center">
                  <p className="text-muted-foreground text-sm pl-[2px] max-w-[50%]">
                    {resource.description || "No description provided"}
                  </p>
                  
                  <div className="flex-1 flex justify-end pr-8">
                    {ratingLoading === resource.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                    ) : (
                      userRatings[resource.id]?.user_rating > 0 ? (
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">Your rating:</span>
                          <StarRating
                            rating={userRatings[resource.id]?.user_rating || 0}
                            readOnly={true}
                            size={16}
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <span 
                            className="text-sm text-primary cursor-pointer hover:underline"
                            onClick={() => {}}
                            onMouseEnter={(e) => {
                              const target = e.currentTarget;
                              const ratingElement = target.nextElementSibling;
                              if (ratingElement) {
                                ratingElement.classList.remove('hidden');
                              }
                            }}
                            onMouseLeave={(e) => {
                              const target = e.currentTarget;
                              const ratingElement = target.nextElementSibling;
                              if (ratingElement) {
                                ratingElement.classList.add('hidden');
                              }
                            }}
                          >
                            Rate
                          </span>
                          <div className="rating-hover hidden absolute top-full mt-1 bg-background border rounded p-1 shadow-md z-10">
                            <StarRating
                              rating={0}
                              onRate={(rating) => handleRate(resource.id, rating)}
                              size={16}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  
                  <p className="text-muted-foreground text-xs font-medium">
                    {new Date(resource.created_at).toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).replace(/\//g, '-')}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
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