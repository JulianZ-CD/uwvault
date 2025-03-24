"use client";

import { useState } from "react";
import { useResource } from "@/app/hooks/useResource";
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
  const [userRating, setUserRating] = useState<number>(0);
  const [localAvgRating, setLocalAvgRating] = useState<number>(resource.average_rating);
  const [localRatingCount, setLocalRatingCount] = useState<number>(resource.rating_count);

  // 处理评分
  const handleRate = async (rating: number) => {
    setRatingLoading(true);
    
    try {
      const result = await rateResource(resource.id, rating);
      if (result) {
        // 设置用户评分
        setUserRating(rating);
        
        // 更新本地评分数据
        setLocalAvgRating(result.average_rating);
        setLocalRatingCount(result.rating_count);
        
        // 通知父组件更新评分信息
        onRatingUpdate(resource.id, result.average_rating, result.rating_count);
        
        // 隐藏评分弹出框
        setShowRatingPopup(false);
      }
    } catch (error) {
      console.error("Error rating resource:", error);
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
                rating={userRating > 0 ? localAvgRating : resource.average_rating} 
                readOnly={true}
                size={20}
                ratingCount={userRating > 0 ? localRatingCount : resource.rating_count}
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
                  {userRating > 0 ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-primary px-3 py-1 bg-primary/10 rounded-md">
                      <span>Your rating:</span>
                      <StarRating
                        rating={userRating}
                        readOnly={true}
                        size={14}
                      />
                    </div>
                  ) : (
                    <span 
                      className="text-sm font-medium text-primary cursor-pointer hover:underline px-3 py-1 bg-primary/10 rounded-md"
                      onClick={() => setShowRatingPopup(!showRatingPopup)}
                      onMouseEnter={() => setShowRatingPopup(true)}
                    >
                      Rate
                    </span>
                  )}
                  
                  {showRatingPopup && (
                    <div 
                      className="absolute left-full ml-2 bg-background border rounded p-2 shadow-md z-10"
                      onMouseLeave={() => setShowRatingPopup(false)}
                    >
                      <StarRating
                        rating={0}
                        userRating={userRating}
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
