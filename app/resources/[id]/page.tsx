"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useResource } from "@/app/hooks/useResource";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Download, ArrowLeft, FileText, Eye } from "lucide-react";
import { useToast } from "@/app/hooks/use-toast";
import { Badge } from "@/app/components/ui/badge";
import { ResourceStatus, StorageStatus } from "@/app/types/resource";

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getResource, downloadResource, actions, getResourceUrl } = useResource();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState<boolean>(false);
  
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
          router.push("/resources");
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchResource();
  }, [params.id, getResource, toast, router]);
  
  const handleDownload = async () => {
    if (!resource) return;
    
    setDownloading(true);
    try {
      await downloadResource(resource.id);
      toast({
        title: "Success",
        description: "Resource downloaded successfully."
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the resource."
      });
    } finally {
      setDownloading(false);
    }
  };
  
  const handleViewDetails = async () => {
    setViewing(true);
    try {
      const url = await getResourceUrl(resource.id);
      if (url) {
        if (isWordDocument(resource.mime_type)) {
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
  
  // 判断是否为Word文档的辅助函数
  const isWordDocument = (fileType?: string): boolean => {
    const wordTypes = [
      'application/msword',                                                  // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    return fileType ? wordTypes.includes(fileType) : false;
  };
  
  // 获取状态对应的样式
  const getStatusBadgeStyle = (status: ResourceStatus) => {
    switch (status) {
      case ResourceStatus.APPROVED:
        return "bg-green-100 text-green-800 border-green-300";
      case ResourceStatus.REJECTED:
        return "bg-red-100 text-red-800 border-red-300";
      case ResourceStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case ResourceStatus.INACTIVE:
        return "bg-gray-100 text-gray-800 border-gray-300";
      case ResourceStatus.UPLOADING:
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  // 获取存储状态对应的样式
  const getStorageStatusBadgeStyle = (status: StorageStatus) => {
    switch (status) {
      case StorageStatus.SYNCED:
        return "bg-green-100 text-green-800 border-green-300";
      case StorageStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case StorageStatus.ERROR:
        return "bg-red-100 text-red-800 border-red-300";
      case StorageStatus.DELETING:
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  // 格式化日期
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes: number | undefined) => {
    if (bytes === undefined) return "N/A";
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
          <Card>
            <CardContent className="pt-6">
              <div className="text-center p-4">
                <h2 className="text-xl font-semibold mb-2">Resource not found</h2>
                <p className="text-muted-foreground mb-4">The requested resource could not be found.</p>
                <Button onClick={() => router.push("/resources")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Resources
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
  
  return (
    <main className="min-h-screen">
      <div className="container py-8">
        <Button 
          variant="outline" 
          onClick={() => router.push("/resources")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resources
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {resource.title}
              </CardTitle>
              <Badge className={getStatusBadgeStyle(resource.status)}>
                {resource.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Description</h3>
                  <p className="text-muted-foreground mt-1">{resource.description || "No description provided."}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Resource ID</h3>
                    <p className="text-muted-foreground">{resource.id}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Course ID</h3>
                    <p className="text-muted-foreground">{resource.course_id || "N/A"}</p>
                  </div>
                </div>
              </div>
              
              {/* 文件信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">File Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Original Filename</h4>
                    <p className="text-muted-foreground">{resource.original_filename || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">File Type</h4>
                    <p className="text-muted-foreground">{resource.file_type || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">MIME Type</h4>
                    <p className="text-muted-foreground">{resource.mime_type || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">File Size</h4>
                    <p className="text-muted-foreground">{formatFileSize(resource.file_size)}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">File Hash</h4>
                    <p className="text-muted-foreground">{resource.file_hash || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Storage Path</h4>
                    <p className="text-muted-foreground">{resource.storage_path || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Storage Status</h4>
                    <Badge className={getStorageStatusBadgeStyle(resource.storage_status)}>
                      {resource.storage_status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* 评分信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">Rating Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Average Rating</h4>
                    <p className="text-muted-foreground">{resource.average_rating?.toFixed(1) || "0"} / 5</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Rating Count</h4>
                    <p className="text-muted-foreground">{resource.rating_count || "0"}</p>
                  </div>
                </div>
              </div>
              
              {/* 审核信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">Review Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Reviewed By</h4>
                    <p className="text-muted-foreground">{resource.reviewed_by || "Not reviewed yet"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Reviewed At</h4>
                    <p className="text-muted-foreground">{formatDate(resource.reviewed_at)}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <h4 className="font-medium">Review Comment</h4>
                    <p className="text-muted-foreground">{resource.review_comment || "No comment provided"}</p>
                  </div>
                </div>
              </div>
              
              {/* 时间信息 */}
              <div>
                <h3 className="text-lg font-medium mb-2">Timestamps</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Created At</h4>
                    <p className="text-muted-foreground">{formatDate(resource.created_at)}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Created By</h4>
                    <p className="text-muted-foreground">{resource.created_by || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Updated At</h4>
                    <p className="text-muted-foreground">{formatDate(resource.updated_at)}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Updated By</h4>
                    <p className="text-muted-foreground">{resource.updated_by || "N/A"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Last Sync At</h4>
                    <p className="text-muted-foreground">{formatDate(resource.last_sync_at)}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Sync Error</h4>
                    <p className="text-muted-foreground">{resource.sync_error || "No errors"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Retry Count</h4>
                    <p className="text-muted-foreground">{resource.retry_count !== undefined ? resource.retry_count : "N/A"}</p>
                  </div>
                </div>
              </div>
              
              {/* 下载和预览按钮 */}
              {actions?.can_download && (
                <div className="pt-4 flex gap-2">
                  <Button 
                    onClick={handleViewDetails}
                    disabled={viewing}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {viewing ? (
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Preview
                  </Button>

                  <Button 
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full sm:w-auto"
                  >
                    {downloading ? (
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}