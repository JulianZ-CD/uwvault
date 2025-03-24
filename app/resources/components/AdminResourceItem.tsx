"use client";

import { useState } from "react";
import { Resource, ResourceStatus } from "@/app/types/resource";
import { useResource } from "@/app/hooks/useResource";
import { Card, CardContent } from "@/app/components/ui/card";
import { FileText } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useRouter } from "next/navigation";
import { ResourceActions } from "@/app/resources/components/ResourceActions";
import { StarRating } from "@/app/components/ui/star-rating";

interface AdminResourceItemProps {
  resource: Resource;
  showRating?: boolean;
  onUpdate?: () => void;
}

export function AdminResourceItem({ resource, showRating = true, onUpdate }: AdminResourceItemProps) {
  const router = useRouter();
  
  // 内部日期格式化函数
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\//g, '-');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  
  // 获取状态徽章
  const getStatusBadge = (status: ResourceStatus) => {
    switch (status) {
      case ResourceStatus.PENDING:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case ResourceStatus.APPROVED:
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case ResourceStatus.REJECTED:
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case ResourceStatus.INACTIVE:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  return (
    <Card className="mb-4 hover:bg-accent/5 transition-colors">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 左侧: 资源信息 */}
          <div className="md:col-span-5">
            <div className="flex items-start space-x-3">
              <div className="bg-muted rounded-md p-2 flex-shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-base">
                  <span className="text-primary/80">{resource.course_id || 'N/A'}</span>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <span>{resource.title}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>ID: {resource.id}</span>
                  <span>•</span>
                  <span>Uploaded: {formatDate(resource.created_at)}</span>
                  <span>•</span>
                  <span>Size: {resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusBadge(resource.status)}
                </div>
                
                {/* 审核评论 (如果有) */}
                {resource.review_comment && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-md text-sm">
                    <span className="font-medium">Review comment:</span> {resource.review_comment}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 中间: 评分星星 */}
          <div className="md:col-span-2 flex items-center justify-center">
            {showRating && (
              <StarRating 
                rating={resource.average_rating} 
                readOnly={true}
                size={20}
                ratingCount={resource.rating_count}
              />
            )}
          </div>
          
          {/* 右侧: 操作按钮 */}
          <div className="md:col-span-5">
            <ResourceActions 
              resourceId={resource.id}
              resource={resource}
              fileType={resource.mime_type}
              onUpdate={onUpdate}
              showAdminActions={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 