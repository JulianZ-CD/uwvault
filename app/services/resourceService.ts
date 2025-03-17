import { 
  Resource, 
  ResourceCreateData, 
  ResourceUpdateData, 
  ResourceReviewData, 
  ResourceListParams, 
  ResourceListResponse,
  ResourceActions
} from "@/app/types/resource";


let cachedActions: ResourceActions | null = null;
let lastActionsFetchTime = 0;
const CACHE_TTL = 60000; // 缓存有效期1分钟

// Add to resourceService.ts
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const tokenStr = localStorage.getItem('token');
  if (tokenStr) {
    try {
      const tokenData = JSON.parse(tokenStr);
      headers['Authorization'] = `Bearer ${tokenData.access_token}`;
    } catch (e) {
      headers['Authorization'] = `Bearer ${tokenStr}`;
    }
  }
  
  return headers;
};

export const resourceService = {
  // get resource list
  async getAllResources(params?: ResourceListParams): Promise<ResourceListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.course_id) queryParams.append('course_id', params.course_id);
      if (params?.search) queryParams.append('search', params.search);
      
      const queryString = queryParams.toString();
      const url = `/api/py/resources/${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn("Authentication required for resources endpoint");
          return { items: [], total: 0 };
        }
        throw new Error(`Failed to fetch resources: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        items: data.items,
        total: data.total
      };
    } catch (error) {
      console.error("Error in getAllResources:", error);
      return { items: [], total: 0 };
    }
  },

  // get single resource
  async getResource(id: number): Promise<Resource> {
    try {
      const response = await fetch(`/api/py/resources/${id}/`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resource with id ${id}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error fetching resource ${id}:`, error);
      throw error;
    }
  },

  // create resource
  async createResource(data: ResourceCreateData): Promise<Response> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.course_id) formData.append('course_id', data.course_id);
    formData.append('file', data.file);

    return await fetch('/api/py/resources/create/', {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(),
    });
  },

  // update resource
  async updateResource(id: number, data: ResourceUpdateData): Promise<Response> {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.course_id) formData.append('course_id', data.course_id);

    return await fetch(`/api/py/resources/${id}/`, {
      method: 'PATCH',
      body: formData,
      headers: getAuthHeaders(),
    });
  },

  // delete resource
  async deleteResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // get resource download URL
  async getResourceUrl(id: number): Promise<string> {
    try {
      const response = await fetch(`/api/py/resources/${id}/download/`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL for resource ${id}`);
      }
      
      const data = await response.text();
      
      try {
        const jsonData = JSON.parse(data);
        return jsonData.url || jsonData;
      } catch (e) {
        return data;
      }
    } catch (error) {
      console.error(`Error getting download URL for resource ${id}:`, error);
      throw error;
    }
  },

  // download resource directly
  async downloadResource(id: number): Promise<Response> {
    const response = await fetch(`/api/py/resources/${id}/download-file/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to download resource ${id}`);
    }
    return response;
  },

  // review resource
  async reviewResource(id: number, data: ResourceReviewData): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/review/`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: getAuthHeaders(),
    });
  },

  // deactivate resource
  async deactivateResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/deactivate/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // reactivate resource
  async reactivateResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/reactivate/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // get user upload history
  async getUserUploads(limit: number = 10, offset: number = 0): Promise<ResourceListResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());
      
      const response = await fetch(`/api/py/resources/history/uploads?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch upload history');
      }
      
      const data = await response.json();
      return {
        items: data.items,
        total: data.total
      };
    } catch (error) {
      console.error("Error fetching upload history:", error);
      return { items: [], total: 0 };
    }
  },

  // get current user's resource actions
  async getResourceActions(): Promise<ResourceActions> {
    try {
      // 检查缓存是否有效
      const now = Date.now();
      if (cachedActions && (now - lastActionsFetchTime < CACHE_TTL)) {
        console.log("Using cached actions data from service");
        return cachedActions;
      }

      console.log("Fetching resource actions...");
      
      const response = await fetch('/api/py/resources/actions', {
        headers: getAuthHeaders(),
      });
      
      console.log("Actions response status:", response.status);
      
      if (response.status === 401 || response.status === 403)  {
        console.warn("Authentication required for actions endpoint");
        return {
          can_upload: false,
          can_download: false,
          can_update: false,
          can_delete: false,
          can_review: false,
          can_manage_status: false,
          can_see_all_statuses: false
        };
      }
      
      if (response.status === 422) {
        console.warn("Authentication issue with actions endpoint (422), using default permissions");
        try {
          const errorData = await response.json();
          console.warn("Error details:", errorData);
        } catch (e) {
          console.warn("Could not parse error response");
        }
        
        return {
          can_upload: true,
          can_download: true,
          can_update: true,
          can_delete: false,
          can_review: false,
          can_manage_status: false,
          can_see_all_statuses: false
        };
      }
      
      if (!response.ok) {
        console.error("Failed to fetch resource actions, status:", response.status);
        throw new Error('Failed to fetch resource actions');
      }
      
      const data = await response.json();
      console.log("Actions data received:", data);
      
      // 更新缓存
      cachedActions = data;
      lastActionsFetchTime = now;
      
      return data;
    } catch (error) {
      console.error("Error fetching actions:", error);
      return {
        can_upload: true,
        can_download: true,
        can_update: true,
        can_delete: true,
        can_review: true,
        can_manage_status: true,
        can_see_all_statuses: false
      };
    }
  }
}; 