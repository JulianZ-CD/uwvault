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
      
      const response = await fetch(url, { redirect: 'follow' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resources, status: ${response.status}`);
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
    const response = await fetch(`/api/py/resources/${id}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch resource with id ${id}`);
    }
    return response.json();
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
    });
  },

  // delete resource
  async deleteResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/`, {
      method: 'DELETE',
    });
  },

  // get resource download URL
  async getResourceUrl(id: number): Promise<string> {
    try {
      const response = await fetch(`/api/py/resources/${id}/download/`);
      
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

  async downloadResource(id: number): Promise<Response> {
    const response = await fetch(`/api/py/resources/${id}/download-file`);
    if (!response.ok) {
      throw new Error(`Failed to download resource ${id}`);
    }
    return response;
  },

  // review resource
  async reviewResource(id: number, data: ResourceReviewData): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/review/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // deactivate resource
  async deactivateResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/deactivate/`, {
      method: 'POST',
    });
  },

  // reactivate resource
  async reactivateResource(id: number): Promise<Response> {
    return await fetch(`/api/py/resources/${id}/reactivate/`, {
      method: 'POST',
    });
  },

  // get current user's resource actions
  async getResourceActions(): Promise<ResourceActions> {
    try {
      console.log("Fetching resource actions...");
      const response = await fetch('/api/py/resources/actions/');
      
      console.log("Actions response status:", response.status);
      
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
          can_delete: true,
          can_review: true,
          can_manage_status: true
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