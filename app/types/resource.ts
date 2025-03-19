// Resource status enum matching backend
export enum ResourceStatus {
    UPLOADING = "uploading",
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    INACTIVE = "inactive"
  }
  
  // Storage status enum matching backend
  export enum StorageStatus {
    SYNCED = "synced",
    PENDING = "pending",
    ERROR = "error",
    DELETING = "deleting"
  }
  
  // Basic resource interface
  export interface Resource {
    id: number;
    title: string;
    description: string;
    course_id: string;
    original_filename?: string;
    file_type: string;
    file_size?: number;
    storage_path?: string;
    mime_type?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
    status: ResourceStatus;
    storage_status: StorageStatus;
    is_active: boolean;
    review_comment?: string;
    reviewed_at?: string;
    reviewed_by?: string;
    last_sync_at?: string;
    sync_error?: string;
    retry_count?: number;
    file_hash?: string;
    average_rating: number;
    rating_count: number;
  }
  
  // Resource rating data
  export interface ResourceRating {
    resource_id: number;
    user_rating: number;
    average_rating: number;
    rating_count: number;
  }
  
  // Resource rating create data
  export interface ResourceRatingCreate {
    rating: number;
  }
  
  // Resource list query params
  export interface ResourceListParams {
    limit?: number;
    offset?: number;
    course_id?: string;
    search?: string;
    is_admin?: boolean
  }
  
  // Resource list response
  export interface ResourceListResponse {
    items: Resource[];
    total: number;
  }
  
  // Resource creation form data
  export interface ResourceCreateData {
    title: string;
    description?: string;
    course_id?: string;
    file: File;
  }
  
  // Resource update form data
  export interface ResourceUpdateData {
    title?: string;
    description?: string;
    course_id?: string;
    file?: File;
    updated_by?: string;
  }
  
  // Resource review form data
  export interface ResourceReviewData {
    status: ResourceStatus;
    review_comment?: string;
    reviewed_by?: string;
  }
  
  // Resource context type
  export interface ResourceContextType {
    resources: Resource[];
    isLoading: boolean;
    error: string | null;
    fetchResources: (params?: ResourceListParams) => Promise<ResourceListResponse>;
    getResource: (id: number) => Promise<Resource | null>;
    createResource: (data: ResourceCreateData) => Promise<Resource | null>;
    updateResource: (id: number, data: ResourceUpdateData) => Promise<Resource | null>;
    deleteResource: (id: number) => Promise<boolean>;
    reviewResource: (id: number, data: ResourceReviewData) => Promise<Resource | null>;
    getResourceUrl: (id: number) => Promise<string | null>;
    downloadResource: (id: number) => Promise<void>;
    rateResource: (id: number, rating: number) => Promise<ResourceRating>;
    getUserRating: (id: number) => Promise<ResourceRating>;
  }
  
  // Resource list props
  export interface ResourceListProps {
    resources: Resource[];
    isAdmin?: boolean;
    onSelect?: (resource: Resource) => void;
  }
  
  // Resource detail props
  export interface ResourceDetailProps {
    resource: Resource;
    isAdmin?: boolean;
    onUpdate?: () => void;
    onDelete?: () => void;
  }
  
  // Resource form props
  export interface ResourceFormProps {
    courseId?: string;
    initialData?: ResourceUpdateData;
    onSuccess?: () => void;
    onSubmit?: (data: ResourceCreateData) => Promise<void>;
    isLoading?: boolean;
  }
  
  // Resource actions
  export interface ResourceActions {
    can_upload: boolean;
    can_download: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_review: boolean;
    can_rate: boolean;
    can_manage_status: boolean;
    can_see_all_statuses: boolean;
  }