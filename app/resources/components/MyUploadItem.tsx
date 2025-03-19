"use client";

import { Resource } from "@/app/types/resource";
import { Card, CardHeader, CardTitle } from "@/app/components/ui/card";
import { StarRating } from "@/app/components/ui/star-rating";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResourceActions } from "@/app/resources/components/ResourceActions";

interface MyUploadItemProps {
  resource: Resource;
}

export function MyUploadItem({ resource }: MyUploadItemProps) {
  const router = useRouter();
  
  // 根据状态获取徽章变体
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved':
        return "default";
      case 'pending':
        return "secondary";
      case 'rejected':
        return "destructive";
      default:
        return "outline";
    }
  };
  
  // 处理资源更新
  const handleUpdate = () => {
    router.push(`/resources/update/${resource.id}`);
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
            
            <div className="w-[20%] flex justify-end items-center gap-2">
              <Badge variant={getStatusVariant(resource.status)}>
                {resource.status}
              </Badge>
              
              <div className="flex items-center">
                <ResourceActions 
                  resourceId={resource.id}
                  fileType={resource.file_type}
                />
                
                {resource.status !== 'approved' && (
                  <Button size="sm" variant="outline" onClick={handleUpdate} className="ml-2">
                    <Edit className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <p className="text-muted-foreground text-sm pl-[2px] w-[40%]">
              {resource.description || "No description provided"}
            </p>
            
            <div className="w-[40%] flex justify-center">
              {/* 空白区域，与ResourceItem保持一致 */}
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
          
          {/* 审核评论 (如果有) */}
          {resource.review_comment && (
            <div className="mt-2 p-2 bg-muted/50 rounded-md text-sm">
              <span className="font-medium">Review comment:</span> {resource.review_comment}
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
