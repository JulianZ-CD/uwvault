"use client";

import { useState } from "react";
import { useResource } from "@/app/hooks/useResource";
import { useToast } from "@/app/hooks/use-toast";
import { Resource } from "@/app/types/resource";
import { Card, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ResourceActions } from "@/app/resources/components/ResourceActions";
import { StarRating } from "@/app/components/ui/star-rating";

interface ResourceItemProps {
  resource: Resource;
  onRatingUpdate: (resourceId: number, averageRating: number, ratingCount: number) => void;
}

export function ResourceItem({ resource, onRatingUpdate }: ResourceItemProps) {
  const { rateResource } = useResource();
  const [ratingLoading, setRatingLoading] = useState<boolean>(false);
  const [showRatingPopup, setShowRatingPopup] = useState<boolean>(false);
  const { toast } = useToast();

  // 处理评分
  const handleRate = async (rating: number) => {
    setRatingLoading(true);
    
    try {
      const result = await rateResource(resource.id, rating);
      if (result) {
        // 通知父组件更新评分信息
        onRatingUpdate(resource.id, result.average_rating, result.rating_count);
        
        toast({
          title: "Rating Submitted",
          description: "Thank you for rating this resource!",
          className: "border-green-500 text-green-700",
        });
        
        // 隐藏评分弹出框
        setShowRatingPopup(false);
      }
    } catch (error) {
      console.error("Error rating resource:", error);
      toast({
        variant: "destructive",
        title: "Rating Failed",
        description: "Failed to submit your rating. Please try again."
      });
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <Card className="hover:bg-accent/5 transition-colors">
      <CardHeader className="flex flex-row items-start space-y-0 pb-2 px-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center">
            <CardTitle className="text-xl w-[40%]">
              <span className="text-primary/80">{resource.course_id || 'N/A'}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span>{resource.title}</span>
            </CardTitle>
            
            <div className="w-[40%] flex justify-center">
              <StarRating 
                rating={resource.average_rating} 
                readOnly={true}
                size={20}
                ratingCount={resource.rating_count}
              />
            </div>
            
            <div className="w-[20%] flex justify-end">
              <ResourceActions 
                resourceId={resource.id}
                fileType={resource.file_type}
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <p className="text-muted-foreground text-sm pl-[2px] w-[40%]">
              {resource.description || "No description provided"}
            </p>
            
            <div className="w-[40%] flex justify-center">
              {ratingLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
              ) : (
                <div className="relative inline-flex items-center">
                  <span 
                    className="text-sm font-medium text-primary cursor-pointer hover:underline px-3 py-1 bg-primary/10 rounded-md"
                    onClick={() => setShowRatingPopup(!showRatingPopup)}
                    onMouseEnter={() => setShowRatingPopup(true)}
                  >
                    Rate
                  </span>
                  {showRatingPopup && (
                    <div 
                      className="absolute left-full ml-2 bg-background border rounded p-2 shadow-md z-10"
                      onMouseLeave={() => setShowRatingPopup(false)}
                    >
                      <StarRating
                        rating={0}
                        onRate={handleRate}
                        size={16}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="w-[20%] flex justify-end">
              <p className="text-muted-foreground text-xs font-medium">
                {new Date(resource.created_at).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\//g, '-')}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
