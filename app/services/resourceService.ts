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
const CACHE_TTL = 300000; 
let fetchingActions = false;


const getAuthHeaders = (isFileUpload = false): HeadersInit => {
  const headers: HeadersInit = {};
  
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
      
      console.log("Resource query params:", Object.fromEntries(queryParams.entries()));
      
      const queryString = queryParams.toString();
      const url = `/api/py/resources/${queryString ? `?${queryString}` : ''}`;
      
      console.log("Fetching resources from URL:", url);
      
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

  // get all available course IDs
  async getCourseIds(): Promise<string[]> {
    try {
      const response = await fetch('/api/py/resources/course-ids', {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch course IDs: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching course IDs:", error);
      return [];
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
    formData.append('file', data.file, data.file.name);
    
    const authHeaders = getAuthHeaders();
    const headers: HeadersInit = {};

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
      headers: getAuthHeaders(true),
    });
  },

  // update resource
  async updateResource(id: number, data: ResourceUpdateData): Promise<Response> {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.course_id) formData.append('course_id', data.course_id);
    
    if (data.file) {
      formData.append('file', data.file, data.file.name);
    }

    return await fetch(`/api/py/resources/${id}/`, {
      method: 'PATCH',
      body: formData,
      headers: getAuthHeaders(true),
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
    const reviewData = {
      status: data.status,
      review_comment: data.review_comment || "",
      reviewed_by: data.reviewed_by || ""
    };
    
    console.log("Sending review data to API:", reviewData);
    
    return await fetch(`/api/py/resources/${id}/review/`, {
      method: 'POST',
      body: JSON.stringify(reviewData),
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
      
      // use cache
      if (cachedActions && (now - lastActionsFetchTime < CACHE_TTL)) {
        return cachedActions;
      }
      
      if (fetchingActions) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.getResourceActions();
      }
      
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
      fetchingActions = false;
    }
  },

  // rate resource
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

  // get user rating for resource
  async getUserRating(id: number): Promise<ResourceRating> {
    try {
      const response = await fetch(`/api/py/resources/${id}/rating`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
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
      return {
        resource_id: id,
        user_rating: 0,
        average_rating: 0,
        rating_count: 0
      };
    }
  },
}; 