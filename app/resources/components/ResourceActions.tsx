"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Download, Eye, Info, Edit, Trash2, Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import { useResource } from "@/app/hooks/useResource";
import { useToast } from "@/app/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { Resource, ResourceStatus, ResourceReviewData } from "@/app/types/resource";
import { ResourceReviewDialog } from "@/app/resources/components/ResourceReviewDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";

interface ResourceActionsProps {
  resourceId: number;
  resource?: Resource;
  fileType?: string;
  onUpdate?: () => void;
  showAdminActions?: boolean;
  hideViewDownload?: boolean;
}

export function ResourceActions({ 
  resourceId, 
  resource, 
  fileType, 
  onUpdate, 
  showAdminActions = false,
  hideViewDownload = false
}: ResourceActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { actions, downloadResource, getResourceUrl, reviewResource, deleteResource } = useResource();
  const [downloading, setDownloading] = useState<boolean>(false);
  const [viewing, setViewing] = useState<boolean>(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'deactivate' | 'activate'>('approve');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  // check if it is a Word document
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
          const previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
          window.open(previewUrl, '_blank');
        } else {
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

  // admin operation related functions
  const handleInfoView = () => {
    if (!resource) return;
    router.push(`/resources/${resource.id}`);
  };
  
  const handleEdit = () => {
    if (!resource) return;
    router.push(`/resources/${resource.id}/edit`);
  };
  
  const handleDelete = async () => {
    if (!resource) return;
    setShowDeleteDialog(true);
  };
  
  const handleDeleteResource = async () => {
    if (!resource) return;
    
    try {
      const success = await deleteResource(resource.id);
      if (success) {
        toast({
          title: "Resource deleted",
          description: `Resource "${resource.title}" has been deleted.`,
        });
        
        // call parent component's update function
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: "Failed to delete the resource."
        });
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "An error occurred while deleting the resource."
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };
  
  const openReviewDialog = (action: 'approve' | 'reject' | 'deactivate' | 'activate') => {
    if (!resource) return;
    
    if (action === 'approve') {
      handleDirectApprove();
    } else if (action === 'activate') {
      handleDirectActivate();
    } else {
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
      // update local resource status
      if (resource) {
        resource.status = ResourceStatus.APPROVED;
      }
      
      toast({
        title: "Resource approved",
        description: `Resource "${resource.title}" has been approved.`,
      });
      
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
      status: ResourceStatus.APPROVED,
      review_comment: "",
      reviewed_by: user?.id || ""
    };
    
    console.log("Directly activating resource:", reviewData);
    
    const updatedResource = await reviewResource(resource.id, reviewData);
    if (updatedResource) {
      if (resource) {
        resource.status = ResourceStatus.APPROVED;
      }
      
      toast({
        title: "Resource activated",
        description: `Resource "${resource.title}" has been activated.`,
      });
      
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
    <div className="flex flex-col gap-2">
      {/* first row: Preview, Download and review buttons */}
      <div className="flex items-center justify-end gap-2">
        {!hideViewDownload && (
          <>
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
                  Preview
                </>
              )}
            </Button>
            
            {actions?.can_download && (
              <Button
                variant="outline"
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
          </>
        )}
        
        {/* review button placed at the rightmost side of the first row */}
        {showAdminActions && resource && resource.status === ResourceStatus.PENDING && (
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
        
        {showAdminActions && resource && resource.status === ResourceStatus.APPROVED && (
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
        
        {showAdminActions && resource && resource.status === ResourceStatus.INACTIVE && (
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
      </div>
      
      {/* second row: Info, Edit and Delete buttons */}
      {showAdminActions && resource && (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleInfoView}
          >
            <Info className="h-4 w-4 mr-1" />
            Info
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}
      
      {/* review dialog */}
      {showAdminActions && resource && (
        <ResourceReviewDialog
          isOpen={isReviewDialogOpen}
          onClose={() => setIsReviewDialogOpen(false)}
          onConfirm={handleReview}
          action={reviewAction}
        />
      )}
      
      {/* delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the resource
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteResource}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
