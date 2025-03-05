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

const isServer = typeof window === 'undefined';

export function useResource() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [actions, setActions] = useState<ResourceActions>({
    can_upload: true,
    can_download: true,
    can_update: true,
    can_delete: isAdmin(),
    can_review: isAdmin(),
    can_manage_status: isAdmin()
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

  const fetchActions = useCallback(async () => {
    try {
      const actionData = await resourceService.getResourceActions();
      setActions(actionData);
    } catch (err) {
      console.error("Error fetching resource permissions:", err);
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

  const fetchResources = useCallback(async (params?: ResourceListParams): Promise<ResourceListResponse> => {
    if (isLoading) return { items: [], total: 0 };
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await resourceService.getAllResources(params);
      setResources(result.items);
      setTotalItems(result.total);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch resources';
      setError(message);
      return { items: [], total: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

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
      
      const updatedResource = await response.json();
      
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

  // review resource
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

  // get resource download URL
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

  // activate/deactivate resource
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

  // download resource
  const downloadResource = useCallback(async (id: number): Promise<void> => {
    if (!id) {
      showAlert("Resource ID is required", "error");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await resourceService.downloadResource(id);
      const blob = await response.blob();
      
      // get filename from Content-Disposition
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `resource-${id}`;
      
      // create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to download resource ${id}`;
      showAlert(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  // initialize
  useEffect(() => {
    if (!isServer) {
      console.log("Client-side initialization - single run");

      (async () => {
        try {
          await fetchActions();
          await fetchResources();
        } catch (err) {
          console.error("Initialization error:", err);
        }
      })();
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
    
    fetchResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    reviewResource,
    getResourceUrl,
    toggleResourceStatus,
    downloadResource,
    
    approveResource: (id: number, comment?: string) => 
      reviewResource(id, { status: ResourceStatus.APPROVED, review_comment: comment }),
    rejectResource: (id: number, comment?: string) => 
      reviewResource(id, { status: ResourceStatus.REJECTED, review_comment: comment }),
    activateResource: (id: number) => toggleResourceStatus(id, true),
    deactivateResource: (id: number) => toggleResourceStatus(id, false),
  };
}