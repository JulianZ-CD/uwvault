"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";
import { useToast } from "@/app/hooks/use-toast";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Trash2, Edit, FileText, Download, Eye } from "lucide-react";
import { ResourceActions } from "@/app/resources/components/ResourceActions";
import { Resource, ResourceStatus } from "@/app/types/resource";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";

// 添加文件大小格式化函数
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// 格式化日期函数
const formatDate = (dateString?: string): string => {
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

export default function AdminResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getResource, deleteResource, downloadResource, getResourceUrl } = useResource();
  const { toast } = useToast();
  
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // 获取资源详情
  useEffect(() => {
    const fetchResource = async () => {
      try {
        const id = Number(params.id);
        if (isNaN(id)) {
          toast({
            variant: "destructive",
            title: "Invalid resource ID",
            description: "The resource ID is not valid."
          });
          router.push("/resources/admin");
          return;
        }
        
        const resourceData = await getResource(id);
        setResource(resourceData);
      } catch (error) {
        console.error("Error fetching resource:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load resource details."
        });
        router.push("/resources/admin");
      } finally {
        setLoading(false);
      }
    };
    
    fetchResource();
  }, [params.id, getResource, toast, router]);
  
  // 处理资源更新
  const handleResourceUpdate = async () => {
    try {
      if (!resource) return;
      const resourceData = await getResource(Number(params.id));
      setResource(resourceData);
      toast({
        title: "Resource Updated",
        description: "The resource has been successfully updated.",
        className: "border-green-500 text-green-700",
      });
    } catch (error) {
      console.error("Error refreshing resource:", error);
    }
  };
  
  // 处理资源删除
  const handleDeleteResource = async () => {
    try {
      if (!resource) return;
      
      const success = await deleteResource(resource.id);
      if (success) {
        toast({
          title: "Resource Deleted",
          description: "The resource has been successfully deleted.",
          className: "border-green-500 text-green-700",
        });
        router.push("/resources/admin");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete resource."
        });
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while deleting the resource."
      });
    }
  };
  
  // 处理资源下载
  const handleDownload = async () => {
    if (!resource) return;
    
    setDownloading(true);
    try {
      await downloadResource(resource.id);
    } catch (error) {
      console.error("Error downloading resource:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download the resource."
      });
    } finally {
      setDownloading(false);
    }
  };
  
  // 处理资源预览
  const handleView = async () => {
    if (!resource) return;
    
    setViewing(true);
    try {
      const url = await getResourceUrl(resource.id);
      if (url) {
        // 判断是否为Word文档
        const isWordDocument = (fileType?: string): boolean => {
          const wordTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ];
          return fileType ? wordTypes.includes(fileType) : false;
        };
        
        if (isWordDocument(resource.file_type)) {
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
        title: "View Failed",
        description: "Failed to preview the resource."
      });
    } finally {
      setViewing(false);
    }
  };
  
  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="container py-8 flex justify-center items-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </main>
    );
  }
  
  if (!resource) {
    return (
      <main className="min-h-screen">
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Resource Not Found</h1>
            <p className="text-muted-foreground mb-6">The resource you are looking for does not exist or has been removed.</p>
            <Button onClick={() => router.push("/resources/admin")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resources
            </Button>
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen">
      <div className="container py-8 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/resources/admin")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Resource Management</h1>
            <div className="ml-4">
              {getStatusBadge(resource.status)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/resources/${resource.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Resource
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        
        {/* 资源基本信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resource Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Title</h3>
                <p className="text-muted-foreground">{resource.title}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Status</h3>
                <div>{getStatusBadge(resource.status)}</div>
              </div>
              
              <div>
                <h3 className="font-medium">Description</h3>
                <p className="text-muted-foreground">{resource.description || "No description provided"}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Course</h3>
                <p className="text-muted-foreground">{resource.course_id || "Not assigned to a course"}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Uploaded by</h3>
                <p className="text-muted-foreground">{resource.created_by}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Upload date</h3>
                <p className="text-muted-foreground">{formatDate(resource.created_at)}</p>
              </div>
              
              <div>
                <h3 className="font-medium">File type</h3>
                <p className="text-muted-foreground">{resource.mime_type || "Unknown"}</p>
              </div>
              
              <div>
                <h3 className="font-medium">File size</h3>
                <p className="text-muted-foreground">{formatFileSize(resource.file_size)}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Rating</h3>
                <p className="text-muted-foreground">
                  {resource.average_rating.toFixed(1)}/5 ({resource.rating_count} ratings)
                </p>
              </div>
              
              {resource.reviewed_by && (
                <div>
                  <h3 className="font-medium">Reviewed by</h3>
                  <p className="text-muted-foreground">{resource.reviewed_by}</p>
                </div>
              )}
              
              {resource.reviewed_at && (
                <div>
                  <h3 className="font-medium">Review date</h3>
                  <p className="text-muted-foreground">{formatDate(resource.reviewed_at)}</p>
                </div>
              )}
              
              {resource.review_comment && (
                <div className="col-span-1 md:col-span-2">
                  <h3 className="font-medium">Review comment</h3>
                  <p className="text-muted-foreground">{resource.review_comment}</p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Management Actions</h3>
              <div className="flex flex-wrap gap-2">
                <ResourceActions 
                  resourceId={resource.id}
                  resource={resource}
                  fileType={resource.file_type}
                  onUpdate={handleResourceUpdate}
                  showAdminActions={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 资源预览区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resource Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{resource.original_filename}</p>
              <p className="text-sm text-muted-foreground mb-4">{formatFileSize(resource.file_size)} • {resource.mime_type}</p>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleView}
                  disabled={viewing}
                >
                  {viewing ? (
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Preview File
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 删除确认对话框 */}
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
    </main>
  );
} 