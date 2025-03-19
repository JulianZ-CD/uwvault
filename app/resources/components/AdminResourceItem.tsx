"use client";

import { useState } from "react";
import { Resource, ResourceStatus, ResourceReviewData } from "@/app/types/resource";
import { useResource } from "@/app/hooks/useResource";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { useToast } from "@/app/hooks/use-toast";
import { ResourceReviewDialog } from "@/app/resources/components/ResourceReviewDialog";
import { FileText, Download, Check, X, Settings, Eye, AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";

interface AdminResourceItemProps {
  resource: Resource;
  showRating?: boolean;
  onUpdate?: () => void;
}

export function AdminResourceItem({ resource, showRating = false, onUpdate }: AdminResourceItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { downloadResource, reviewResource } = useResource();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'deactivate'>('approve');
  
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
  
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadResource(resource.id);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download the resource."
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleViewDetails = () => {
    router.push(`/resources/${resource.id}`);
  };
  
  const handleOperate = () => {
    router.push(`/resources/admin/review/${resource.id}`);
  };
  
  const openReviewDialog = (action: 'approve' | 'reject' | 'deactivate') => {
    if (action === 'approve') {
      // 直接处理 approve，不显示对话框
      handleDirectApprove();
    } else {
      // 其他操作显示对话框
      setReviewAction(action);
      setIsReviewDialogOpen(true);
    }
  };
  
  const handleDirectApprove = async () => {
    const reviewData: ResourceReviewData = {
      status: ResourceStatus.APPROVED,
      review_comment: "",
      reviewed_by: user?.id || ""
    };
    
    console.log("Directly approving resource:", reviewData);
    
    const updatedResource = await reviewResource(resource.id, reviewData);
    if (updatedResource) {
      // 更新本地资源状态
      resource.status = ResourceStatus.APPROVED;
      
      toast({
        title: "Resource approved",
        description: `Resource "${resource.title}" has been approved.`,
      });
      
      // 调用父组件的更新函数
      if (onUpdate) {
        onUpdate();
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to approve resource. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReview = async (comment: string) => {
    // 构建完整的 ResourceReviewData 对象
    const reviewData: ResourceReviewData = {
      status: reviewAction === 'approve' 
        ? ResourceStatus.APPROVED 
        : reviewAction === 'reject'
          ? ResourceStatus.REJECTED
          : ResourceStatus.INACTIVE,
      review_comment: comment,
      reviewed_by: user?.id || ""
    };
    
    console.log("Sending review data:", reviewData);
    
    const updatedResource = await reviewResource(resource.id, reviewData);
    if (updatedResource) {
      // 更新本地资源状态
      resource.status = reviewData.status;
      
      toast({
        title: "Resource reviewed",
        description: `Resource "${resource.title}" has been ${reviewAction === 'approve' ? 'approved' : reviewAction === 'reject' ? 'rejected' : 'deactivated'}.`,
      });
      
      // 调用父组件的更新函数
      if (onUpdate) {
        onUpdate();
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to review resource. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const getStatusBadge = () => {
    switch (resource.status) {
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
    <>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 左侧: 资源信息 */}
            <div className="md:col-span-5">
              <div className="flex items-start">
                <FileText className="h-5 w-5 mr-2 mt-1 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Course: {resource.course_id || 'N/A'}</span>
                    <span>•</span>
                    <span>By: {resource.created_by}</span>
                    <span>•</span>
                    <span>Date: {formatDate(resource.created_at)}</span>
                    <span>•</span>
                    {getStatusBadge()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右侧: 操作按钮 */}
            <div className="md:col-span-7">
              <div className="flex flex-wrap gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleViewDetails}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Download
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOperate}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Operate
                </Button>
                
                {resource.status === ResourceStatus.PENDING && (
                  <>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => openReviewDialog('approve')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => openReviewDialog('reject')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                
                {resource.status === ResourceStatus.APPROVED && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    onClick={() => openReviewDialog('deactivate')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* 评分信息 (仅在 showRating 为 true 时显示) */}
          {showRating && (
            <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
              <div className="flex items-center">
                <span>Rating: {resource.average_rating.toFixed(1)}/5</span>
                <span className="mx-2">•</span>
                <span>{resource.rating_count} ratings</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ResourceReviewDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        onConfirm={handleReview}
        action={reviewAction}
      />
    </>
  );
} 