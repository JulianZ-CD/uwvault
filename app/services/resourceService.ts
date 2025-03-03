import { 
  Resource, 
  ResourceCreateData, 
  ResourceUpdateData, 
  ResourceReviewData, 
  ResourceListParams, 
  ResourceListResponse,
  ResourceActions
} from "@/app/types/resource";

export const resourceService = {
  // 获取资源列表
  async getAllResources(params?: ResourceListParams): Promise<ResourceListResponse> {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.course_id) queryParams.append('course_id', params.course_id);
      if (params?.search) queryParams.append('search', params.search);
      
      const queryString = queryParams.toString();
      const url = `/api/py/resources/${queryString ? `?${queryString}` : ''}`;
      
      console.log("Fetching resources from URL:", url);
      
      try {
        const response = await fetch(url, { redirect: 'follow' });
        console.log("Resources list response status:", response.status);
        
        if (!response.ok) {
          console.error(`Failed to fetch resources, status: ${response.status}`);
          return { items: [], total: 0 };
        }

        const resources = await response.json();
        console.log("Resources fetched successfully, count:", resources.length);
        
        return {
          items: resources,
          total: resources.length
        };
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        // 返回空结果
        return { items: [], total: 0 };
      }
    } catch (error) {
      console.error("Error in getAllResources:", error);
      // 返回空结果
      return { items: [], total: 0 };
    }
  },

  // 获取单个资源
  async getResource(id: number): Promise<Resource> {
    const response = await fetch(`/api/py/resources/${id}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch resource with id ${id}`);
    }
    return response.json();
  },

  // 创建资源
  async createResource(data: ResourceCreateData): Promise<Response> {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.course_id) formData.append('course_id', data.course_id);
    formData.append('file', data.file);

    return await fetch('/api/py/resources/create/', {
      method: 'POST',
      body: formData,
      // 不设置Content-Type，让浏览器自动设置为multipart/form-data
    });
  },

  // 更新资源
  async updateResource(id: number, data: ResourceUpdateData): Promise<Response> {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.course_id) formData.append('course_id', data.course_id);

    return await fetch(`/api/py/resources/${id}/`, {
      method: 'PATCH',
      body: formData,
    });
  },

  // 删除资源
  async deleteResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/`, {
      method: 'DELETE',
    });
  },

  // 获取资源下载URL
  async getResourceUrl(id: number): Promise<string> {
    const response = await fetch(`/api/py/resources/${id}/download/`);
    if (!response.ok) {
      throw new Error(`Failed to get download URL for resource ${id}`);
    }
    const data = await response.json();
    return data.url;
  },

  // 审核资源
  async reviewResource(id: number, data: ResourceReviewData): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/review/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // 停用资源
  async deactivateResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/deactivate/`, {
      method: 'POST',
    });
  },

  // 重新激活资源
  async reactivateResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/reactivate/`, {
      method: 'POST',
    });
  },

  // 获取当前用户可用的资源操作
  async getResourceActions(): Promise<ResourceActions> {
    try {
      console.log("Fetching resource actions...");
      const response = await fetch('/api/py/resources/actions/');
      
      console.log("Actions response status:", response.status);
      
      // 添加特殊处理422错误的逻辑
      if (response.status === 422) {
        console.warn("Authentication issue with actions endpoint (422), using default permissions");
        // 尝试读取错误详情
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
          can_delete: true,  // 临时允许所有操作以便测试
          can_review: true,  // 临时允许所有操作以便测试
          can_manage_status: true  // 临时允许所有操作以便测试
        };
      }
      
      if (!response.ok) {
        console.error("Failed to fetch resource actions, status:", response.status);
        throw new Error('Failed to fetch resource actions');
      }
      
      const data = await response.json();
      console.log("Actions data received:", data);
      return data;
    } catch (error) {
      console.error("Error fetching actions:", error);
      // 错误时返回默认权限，临时允许所有操作以便测试
      return {
        can_upload: true,
        can_download: true,
        can_update: true,
        can_delete: true,
        can_review: true,
        can_manage_status: true
      };
    }
  }
}; 