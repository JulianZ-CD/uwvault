"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Download, Eye, Settings, Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import { useResource } from "@/app/hooks/useResource";
import { useToast } from "@/app/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { Resource, ResourceStatus, ResourceReviewData } from "@/app/types/resource";
import { ResourceReviewDialog } from "@/app/resources/components/ResourceReviewDialog";

interface ResourceActionsProps {
  resourceId: number;
  resource?: Resource;
  fileType?: string;
  onUpdate?: () => void;
  showAdminActions?: boolean;
}

export function ResourceActions({ resourceId, resource, fileType, onUpdate, showAdminActions = false }: ResourceActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { actions, downloadResource, getResourceUrl, reviewResource } = useResource();
  const [downloading, setDownloading] = useState<boolean>(false);
  const [viewing, setViewing] = useState<boolean>(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'deactivate' | 'activate'>('approve');
  const { toast } = useToast();

  // 判断是否为Word文档
  const isWordDocument = (fileType?: string): boolean => {
    const wordTypes = [
      'application/msword',                                                  // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    return fileType ? wordTypes.includes(fileType) : false;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const success = await downloadResource(resourceId);
      if (!success) {
        toast({
          variant: "destructive",
          title: "Download failed",
          description: "Please check your permissions or try again later",
        });
      }
    } catch (error) {
      console.error("Error downloading resource:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Please check your permissions or try again later",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleViewDetails = async () => {
    setViewing(true);
    try {
      const url = await getResourceUrl(resourceId);
      if (url) {
        if (isWordDocument(fileType)) {
          // 使用Google Docs预览Word文档
          const previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
          window.open(previewUrl, '_blank');
        } else {
          // PDF和其他文件类型直接打开
          window.open(url, '_blank');
        }
      }
    } catch (error) {
      console.error("Error viewing resource:", error);
      toast({
        variant: "destructive",
        title: "View failed",
        description: "Could not open the resource",
      });
    } finally {
      setViewing(false);
    }
  };

  // 管理员操作相关函数 - 仅当 showAdminActions 为 true 且 resource 存在时可用
  const handleAdminViewDetails = () => {
    if (!resource) return;
    router.push(`/resources/${resource.id}`);
  };
  
  const handleOperate = () => {
    if (!resource) return;
    router.push(`/resources/admin/review/${resource.id}`);
  };
  
  const openReviewDialog = (action: 'approve' | 'reject' | 'deactivate' | 'activate') => {
    if (!resource) return;
    
    if (action === 'approve') {
      // 直接处理 approve，不显示对话框
      handleDirectApprove();
    } else if (action === 'activate') {
      // 直接处理 activate，不显示对话框
      handleDirectActivate();
    } else {
      // 其他操作显示对话框
      setReviewAction(action);
      setIsReviewDialogOpen(true);
    }
  };
  
  const handleDirectApprove = async () => {
    if (!resource) return;
    
    const reviewData: ResourceReviewData = {
      status: ResourceStatus.APPROVED,
      review_comment: "",
      reviewed_by: user?.id || ""
    };
    
    console.log("Directly approving resource:", reviewData);
    
    const updatedResource = await reviewResource(resource.id, reviewData);
    if (updatedResource) {
      // 更新本地资源状态
      if (resource) {
        resource.status = ResourceStatus.APPROVED;
      }
      
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
  
  const handleDirectActivate = async () => {
    if (!resource) return;
    
    const reviewData: ResourceReviewData = {
      status: ResourceStatus.APPROVED, // 激活时将状态设为已批准
      review_comment: "",
      reviewed_by: user?.id || ""
    };
    
    console.log("Directly activating resource:", reviewData);
    
    const updatedResource = await reviewResource(resource.id, reviewData);
    if (updatedResource) {
      // 更新本地资源状态
      if (resource) {
        resource.status = ResourceStatus.APPROVED;
      }
      
      toast({
        title: "Resource activated",
        description: `Resource "${resource.title}" has been activated.`,
      });
      
      // 调用父组件的更新函数
      if (onUpdate) {
        onUpdate();
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to activate resource. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReview = async (comment: string) => {
    if (!resource) return;
    
    // 构建完整的 ResourceReviewData 对象
    const reviewData: ResourceReviewData = {
      status: reviewAction === 'approve' 
        ? ResourceStatus.APPROVED 
        : reviewAction === 'reject'
          ? ResourceStatus.REJECTED
          : reviewAction === 'activate'
            ? ResourceStatus.APPROVED
            : ResourceStatus.INACTIVE,
      review_comment: comment,
      reviewed_by: user?.id || ""
    };
    
    console.log("Sending review data:", reviewData);
    
    const updatedResource = await reviewResource(resource.id, reviewData);
    if (updatedResource) {
      // 更新本地资源状态
      if (resource) {
        resource.status = reviewData.status;
      }
      
      toast({
        title: "Resource reviewed",
        description: `Resource "${resource.title}" has been ${
          reviewAction === 'approve' ? 'approved' : 
          reviewAction === 'reject' ? 'rejected' : 
          reviewAction === 'activate' ? 'activated' : 
          'deactivated'
        }.`,
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

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 原有的查看和下载按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
          disabled={viewing}
        >
          {viewing ? (
            <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </>
          )}
        </Button>
        
        {actions?.can_download && (
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {/* 管理员操作按钮 */}
        {showAdminActions && resource && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAdminViewDetails}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <div className="animate-spin h-4 w-4 border-2 border-b-transparent rounded-full"></div>
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
            
            {resource.status === ResourceStatus.INACTIVE && (
              <Button 
                variant="outline" 
                size="sm"
                className="border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => openReviewDialog('activate')}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Activate
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* 审核对话框 */}
      {showAdminActions && resource && (
        <ResourceReviewDialog
          isOpen={isReviewDialogOpen}
          onClose={() => setIsReviewDialogOpen(false)}
          onConfirm={handleReview}
          action={reviewAction}
        />
      )}
    </>
  );
}
