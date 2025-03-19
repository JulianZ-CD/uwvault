import { 
  Resource, 
  ResourceCreateData, 
  ResourceUpdateData, 
  ResourceReviewData, 
  ResourceListParams, 
  ResourceListResponse,
  ResourceActions,
  ResourceRating,
  ResourceRatingCreate
} from "@/app/types/resource";


let cachedActions: ResourceActions | null = null;
let lastActionsFetchTime = 0;
const CACHE_TTL = 300000; // 5分钟
let fetchingActions = false;

// Add to resourceService.ts
const getAuthHeaders = (isFileUpload = false): HeadersInit => {
  const headers: HeadersInit = {};
  
  // 只有在不是文件上传时才设置 Content-Type
  if (!isFileUpload) {
    headers["Content-Type"] = 'application/json';
  }
  
  const tokenStr = localStorage.getItem('token');
  if (tokenStr) {
    try {
      const tokenData = JSON.parse(tokenStr);
      headers["Authorization"] = `Bearer ${tokenData.access_token}`;
    } catch (e) {
      headers["Authorization"] = `Bearer ${tokenStr}`;
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
    // formData.append('file', data.file);

    // 正确地添加文件，确保包含文件名
    formData.append('file', data.file, data.file.name);
    
    // 获取认证头，但避免设置Content-Type
    const authHeaders = getAuthHeaders();
    // 创建新的headers对象，只包含授权信息
    const headers: HeadersInit = {};

    // 只复制Authorization头
    if ('Authorization' in authHeaders) {
      headers['Authorization'] = authHeaders['Authorization'];
    }

    console.log("Sending form data:", {
      title: data.title,
      description: data.description,
      course_id: data.course_id,
      file: {
        name: data.file.name,
        type: data.file.type,
        size: data.file.size
      }
    });

    return await fetch('/api/py/resources/create/', {
      method: 'POST',
      body: formData,
      // headers: getAuthHeaders(),
      headers: getAuthHeaders(true),
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
      const now = Date.now();
      
      // 使用缓存
      if (cachedActions && (now - lastActionsFetchTime < CACHE_TTL)) {
        return cachedActions;
      }
      
      // 如果已经有请求在进行中，等待该请求完成
      if (fetchingActions) {
        // 等待一小段时间后再次检查缓存
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.getResourceActions();
      }
      
      // 标记正在获取数据
      fetchingActions = true;
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
          can_rate: false,
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
          can_rate: true,
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
        can_rate: true,
        can_manage_status: true,
        can_see_all_statuses: true
      };
    } finally {
      // 无论成功失败，都重置锁定状态
      fetchingActions = false;
    }
  },

  // 对资源进行评分
  async rateResource(id: number, rating: number): Promise<ResourceRating> {
    try {
      const ratingData: ResourceRatingCreate = {
        rating: rating
      };

      const response = await fetch(`/api/py/resources/${id}/rating`, {
        method: 'POST',
        body: JSON.stringify(ratingData),
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to rate resource ${id}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error rating resource ${id}:`, error);
      throw error;
    }
  },

  // 获取用户对资源的评分
  async getUserRating(id: number): Promise<ResourceRating> {
    try {
      const response = await fetch(`/api/py/resources/${id}/rating`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // 用户未对该资源评分，返回默认值
          return {
            resource_id: id,
            user_rating: 0,
            average_rating: 0,
            rating_count: 0
          };
        }
        throw new Error(`Failed to get user rating for resource ${id}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error getting user rating for resource ${id}:`, error);
      // 出错时返回默认值
      return {
        resource_id: id,
        user_rating: 0,
        average_rating: 0,
        rating_count: 0
      };
    }
  },
}; 