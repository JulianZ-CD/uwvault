import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { 
  Resource, 
  ResourceCreateData, 
  ResourceUpdateData, 
  ResourceReviewData, 
  ResourceListParams,
  ResourceListResponse,
  ResourceActions,
  ResourceStatus
} from "@/app/types/resource";
import { resourceService } from "@/app/services/resourceService";
import { useToast } from "@/app/hooks/use-toast";

const isServer = typeof window === 'undefined';

export function useResource() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [actions, setActions] = useState<ResourceActions>({
    can_upload: false,
    can_download: false,
    can_update: false,
    can_delete: false,
    can_review: false,
    can_manage_status: false,
    can_see_all_statuses: false
  });

  const showAlert = (message: string, type: "success" | "error") => {
    if (type === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setError(message);
    } else {
      toast({
        title: "Success",
        description: message,
        className: "border-green-500 text-green-700",
      });
      setError(null);
    }
  };

  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

  const fetchActions = useCallback(async () => {
    if (!user) {
      console.warn("User not authenticated, using default permissions");
      // 设置默认权限
      const defaultActions = {
        can_upload: false,
        can_download: false,
        can_update: false,
        can_delete: false,
        can_review: false,
        can_manage_status: false,
        can_see_all_statuses: false
      };
      setActions(defaultActions);
      return defaultActions;
    }
    
    try {
      setError(null);
      const actionsData = await resourceService.getResourceActions();
      setActions(actionsData);
      return actionsData;
    } catch (err) {
      console.error("Error fetching actions:", err);
      // 根据用户角色提供默认权限
      const defaultActions = {
        can_upload: true,
        can_download: true,
        can_update: true,
        can_delete: isAdmin(),
        can_review: isAdmin(),
        can_manage_status: isAdmin(),
        can_see_all_statuses: isAdmin()
      };
      setActions(defaultActions);
      return defaultActions;
    }
  }, [user, isAdmin]);

const fetchResources = useCallback(async (params?: ResourceListParams): Promise<ResourceListResponse> => {
  if (!user) {
    console.warn("User not authenticated, skipping resource fetch");
    return { items: [], total: 0 };
  }
  
  setIsLoading(true);
  setError(null);
  
  try {
    // 添加更智能的重试逻辑
    let retries = 0;
    const maxRetries = 2;
    let lastError: any = null;

    while (retries <= maxRetries) {
      try { 
        const result = await resourceService.getAllResources(params);
        setResources(result.items);
        setTotalItems(result.total);
        return result;
      } catch (err: any) {
        lastError = err;
        
        // 对401/403错误不重试，直接抛出
        if (err.status === 401 || err.status === 403) {
          console.error("Authentication error, not retrying:", err);
          break;
        }
        
        retries++;
        console.log(`Trying to fetch resources (Attempt ${retries}/${maxRetries})`);
        
        if (retries > maxRetries) {
          break;
        }
        
        // 增加指数退避重试延迟
        const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("Failed to fetch resources after retries");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error.message);
    throw error;
  } finally {
    setIsLoading(false);
  }
}, [user]);

  // 初始化时获取权限
  useEffect(() => {
    if (user && !authLoading) {
      fetchActions();
    }
  }, [user, authLoading, fetchActions]);

  // get single resource
  const getResource = useCallback(async (id: number): Promise<Resource | null> => {
    try {
      console.log(`[DEBUG] useResource.getResource: Fetching resource ${id}`);
      const resource = await resourceService.getResource(id);
      console.log(`[DEBUG] useResource.getResource: Resource fetched:`, resource);
      return resource;
    } catch (error) {
      console.error(`[DEBUG] useResource.getResource: Error:`, error);
      throw error;
    }
  }, []);

  // create resource
  const createResource = useCallback(async (data: ResourceCreateData): Promise<Resource | null> => {
    setIsCreating(true);
    setError(null);
    
    try {
      console.log("Sending resource creation request with data:", {
        title: data.title,
        description: data.description,
        fileName: data.file.name,
        fileSize: data.file.size,
        fileType: data.file.type
      });
      
      const response = await resourceService.createResource(data);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create resource: ${response.status} ${response.statusText} ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log("Resource creation response data:", responseData);
      
      if (!responseData || !responseData.id) {
        console.warn("Resource created but no ID returned:", responseData);
      }
      
      return responseData;
    } catch (err) {
      console.error("Error creating resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to create resource');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // update resource
  const updateResource = useCallback(async (id: number, data: ResourceUpdateData): Promise<Resource | null> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return null;
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await resourceService.updateResource(id, data);
      
      if (!response.ok) {
        throw new Error(`Error updating resource: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (err) {
      console.error("Error updating resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to update resource');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [showAlert]);

  // delete resource
  const deleteResource = useCallback(async (id: number): Promise<boolean> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return false;
    }
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await resourceService.deleteResource(id);
      
      if (!response.ok) {
        throw new Error(`Error deleting resource: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error("Error deleting resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [showAlert]);

  // get resource download URL
  const getResourceUrl = useCallback(async (id: number): Promise<string | null> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return null;
    }
    
    try {
      return await resourceService.getResourceUrl(id);
    } catch (err) {
      console.error("Error getting resource URL:", err);
      setError(err instanceof Error ? err.message : 'Failed to get resource URL');
      return null;
    }
  }, [showAlert]);

  // download resource
  const downloadResource = useCallback(async (id: number): Promise<boolean> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return false;
    }
    
    try {
      // 直接使用 resourceService.downloadResource 进行下载
      const response = await resourceService.downloadResource(id);
      
      // 处理文件下载
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `resource-${id}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      console.error("Error downloading resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to download resource');
      showAlert("Download failed, please check your permissions or try again later", "error");
      return false;
    }
  }, [showAlert]);

  // review resource
  const reviewResource = useCallback(async (id: number, data: ResourceReviewData): Promise<boolean> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return false;
    }
    
    try {
      const response = await resourceService.reviewResource(id, data);
      
      if (!response.ok) {
        throw new Error(`Error reviewing resource: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error("Error reviewing resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to review resource');
      return false;
    }
  }, [showAlert]);

  // deactivate resource
  const deactivateResource = useCallback(async (id: number): Promise<boolean> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return false;
    }
    
    try {
      const response = await resourceService.deactivateResource(id);
      
      if (!response.ok) {
        throw new Error(`Error deactivating resource: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error("Error deactivating resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to deactivate resource');
      return false;
    }
  }, [showAlert]);

  // reactivate resource
  const reactivateResource = useCallback(async (id: number): Promise<boolean> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return false;
    }
    
    try {
      const response = await resourceService.reactivateResource(id);
      
      if (!response.ok) {
        throw new Error(`Error reactivating resource: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error("Error reactivating resource:", err);
      setError(err instanceof Error ? err.message : 'Failed to reactivate resource');
      return false;
    }
  }, [showAlert]);

  // get user upload history
  const getUserUploads = useCallback(async (limit: number = 10, offset: number = 0): Promise<ResourceListResponse> => {
    try {
      return await resourceService.getUserUploads(limit, offset);
    } catch (err) {
      console.error("Error getting user uploads:", err);
      setError(err instanceof Error ? err.message : 'Failed to get user uploads');
      return { items: [], total: 0 };
    }
  }, []);

  return {
    resources,
    totalItems,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    actions,
    isAdmin,
    fetchResources,
    fetchActions,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    getResourceUrl,
    downloadResource,
    reviewResource,
    deactivateResource,
    reactivateResource,
    getUserUploads
  };
}