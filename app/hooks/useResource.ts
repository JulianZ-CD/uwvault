import { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/app/hooks/useAuth";

// 检测是否在服务器端
const isServer = typeof window === 'undefined';

export function useResource() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  // 基础状态
  const [resources, setResources] = useState<Resource[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 加载状态 - 适度粒度
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 权限状态
  const [actions, setActions] = useState<ResourceActions>({
    can_upload: true,
    can_download: true,
    can_update: true,
    can_delete: isAdmin(),
    can_review: isAdmin(),
    can_manage_status: isAdmin()
  });

  // 统一的提示显示
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


  
  // 获取权限
  const fetchActions = useCallback(async () => {
    try {
      const actionData = await resourceService.getResourceActions();
      setActions(actionData);
    } catch (err) {
      console.error("Error fetching resource permissions:", err);
      // 默认权限基于用户角色
      setActions({
        can_upload: true,
        can_download: true,
        can_update: true,
        can_delete: isAdmin(),
        can_review: isAdmin(),
        can_manage_status: isAdmin()
      });
    }
  }, [isAdmin]);

  // 获取资源列表
  const fetchResources = useCallback(async (params?: ResourceListParams): Promise<ResourceListResponse> => {
    console.log("fetchResources called, setting isLoading to true");
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching resources with params:", params);
      
      // 暂时注释掉is_admin参数，直到我们解决类型问题
      // 创建一个新的参数对象，避免修改原始参数
      const queryParams = { ...params };
      
      // 管理员可以查看所有资源（包括待审核的）
      // 暂时注释掉，等待后端API支持或类型定义更新
      // if (isAdmin()) {
      //   (queryParams as any).is_admin = true;
      // }
      
      const result = await resourceService.getAllResources(queryParams);
      console.log("Resources fetched:", result);
      
      // 更新本地状态
      setResources(result.items);
      setTotalItems(result.total);
      
      console.log("Successfully fetched resources, setting isLoading to false");
      setIsLoading(false); // 也在这里设置为false，确保即使提前返回也会重置状态
      
      return result;
    } catch (err) {
      console.error("Error fetching resources:", err);
      const message = err instanceof Error ? err.message : 'Failed to fetch resources';
      setError(message);
      showAlert(message, "error");
      setIsLoading(false); // 确保出错时也重置loading状态
      return { items: [], total: 0 };
    } finally {
      console.log("Finally block: setting isLoading to false");
      setIsLoading(false); // 最后保证重置
    }
  }, [isAdmin, showAlert]);

  // 获取单个资源
  const getResource = useCallback(async (id: number): Promise<Resource | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const resource = await resourceService.getResource(id);
      return resource;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to fetch resource #${id}`;
      showAlert(message, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  // 创建资源
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

  // 更新资源
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
      
      const updatedResource = await response.json();
      
      // 更新资源列表
      await fetchResources();
      
      showAlert("Resource updated successfully", "success");
      return updatedResource;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to update resource #${id}`;
      showAlert(message, "error");
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchResources, showAlert]);

  // 删除资源
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
      
      // 更新资源列表
      await fetchResources();
      
      showAlert("Resource deleted successfully", "success");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to delete resource #${id}`;
      showAlert(message, "error");
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [fetchResources, showAlert]);

  // 审核资源
  const reviewResource = useCallback(async (id: number, data: ResourceReviewData): Promise<Resource | null> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return null;
    }
    
    if (!isAdmin()) {
      showAlert("Only administrators can review resources", "error");
      return null;
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await resourceService.reviewResource(id, data);
      
      if (!response.ok) {
        throw new Error(`Error reviewing resource: ${response.statusText}`);
      }
      
      const reviewedResource = await response.json();
      
      // 更新资源列表
      await fetchResources();
      
      showAlert("Resource reviewed successfully", "success");
      return reviewedResource;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to review resource #${id}`;
      showAlert(message, "error");
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchResources, isAdmin, showAlert]);

  // 获取资源下载URL
  const getResourceUrl = useCallback(async (id: number): Promise<string | null> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const url = await resourceService.getResourceUrl(id);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to get download URL for resource #${id}`;
      showAlert(message, "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  // 便捷方法：激活/停用资源
  const toggleResourceStatus = useCallback(async (id: number, activate: boolean): Promise<Resource | null> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return null;
    }
    
    if (!isAdmin()) {
      showAlert("Only administrators can change resource status", "error");
      return null;
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = activate 
        ? await resourceService.reactivateResource(id)
        : await resourceService.deactivateResource(id);
      
      if (!response.ok) {
        throw new Error(`Error changing resource status: ${response.statusText}`);
      }
      
      const updatedResource = await response.json();
      
      // 更新资源列表
      await fetchResources();
      
      const message = activate ? "Resource activated successfully" : "Resource deactivated successfully";
      showAlert(message, "success");
      return updatedResource;
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to change status for resource #${id}`;
      showAlert(message, "error");
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchResources, isAdmin, showAlert]);

  // 修改初始化逻辑
  useEffect(() => {
    // 仅在客户端执行且只执行一次
    if (!isServer) {
      console.log("Client-side initialization - single run");
      
      // 使用立即执行的异步函数
      (async () => {
        try {
          await fetchActions();
          await fetchResources();
        } catch (err) {
          console.error("Initialization error:", err);
        }
      })();
    }
  // 移除依赖数组中的函数，使用空数组确保只执行一次
  }, []);

  
  return {
    // 状态
    resources,
    totalItems,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    actions,
    
    // 方法
    fetchResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    reviewResource,
    getResourceUrl,
    toggleResourceStatus,
    
    // 便捷方法
    approveResource: (id: number, comment?: string) => 
      reviewResource(id, { status: ResourceStatus.APPROVED, review_comment: comment }),
    rejectResource: (id: number, comment?: string) => 
      reviewResource(id, { status: ResourceStatus.REJECTED, review_comment: comment }),
    activateResource: (id: number) => toggleResourceStatus(id, true),
    deactivateResource: (id: number) => toggleResourceStatus(id, false),
  };
}