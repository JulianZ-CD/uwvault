from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Dict, Optional
from datetime import timedelta

from api.models.resource import (
    ResourceBase, ResourceCreate, ResourceUpdate, 
    ResourceInDB, ResourceReview, ResourceStatus
)
from api.services.resource_service import ResourceService
# 临时使用 mock auth
from api.core.mock_auth import get_current_user, require_admin  # 临时导入
from api.core.exceptions import NotFoundError, ValidationError, StorageError
from api.utils.logger import setup_logger

router = APIRouter(
    prefix="/api/py/resources",
    tags=["resources"]
)

# 依赖注入
resource_service = ResourceService()
logger = setup_logger("resource_router")

# 1. 基础资源操作（所有用户可用）
@router.get("/{id}", response_model=ResourceInDB)
async def get_resource(
    id: int,
    current_user = Depends(get_current_user)
):
    """Get resource details
    
    Args:
        id: Resource ID
        current_user: Current authenticated user
        
    Returns:
        Resource details if found and accessible
    """
    try:
        include_pending = current_user.is_admin
        return await resource_service.get_resource_by_id(id, include_pending)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get resource")

@router.get("/{id}/download")
async def get_resource_url(
    id: int,
    current_user = Depends(get_current_user)
):
    """Get resource download URL
    
    Args:
        id: Resource ID
        current_user: Current authenticated user
        
    Returns:
        Signed URL for resource download
    """
    try:
        return await resource_service.get_resource_url(
            id,
            expiration=timedelta(minutes=30)
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting resource URL {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get download URL")

@router.post("/create", response_model=ResourceInDB)
async def create_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """创建新资源"""
    try:
        # 准备资源数据
        resource_data = ResourceCreate(
            title=title,
            description=description,
            course_id=course_id,
            uploader_id=current_user.id,
            original_filename=file.filename
        )
        
        # 调用服务层创建资源
        return await resource_service.create_resource(resource_data, file)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{id}", response_model=ResourceInDB)
async def update_resource(
    id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """Update resource details
    
    Args:
        id: Resource ID
        title: New title (optional)
        description: New description (optional)
        course_id: New course ID (optional)
        current_user: Current authenticated user
        
    Returns:
        Updated resource details
    """
    try:
        update_data = ResourceUpdate(
            title=title,
            description=description,
            course_id=course_id,
            updated_by=current_user.id
        )
        return await resource_service.update_resource(id, update_data)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update resource")

# 2. 管理员功能
@router.post("/{id}/review", response_model=ResourceInDB)
async def review_resource(
    id: int,
    review_data: ResourceReview,
    current_user = Depends(require_admin)
):
    """审核资源（仅管理员）"""
    try:
        review = ResourceReview(
            status=review_data.status,
            review_comment=review_data.review_comment,
            reviewed_by=current_user.id
        )
        resource = await resource_service.review_resource(id, review)
        return resource
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error reviewing resource {id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to review resource"
        )

@router.delete("/{id}", tags=["admin"])
async def delete_resource(
    id: int,
    current_user = Depends(require_admin)
):
    """Delete a resource (admin only)
    
    Args:
        id: Resource ID
        current_user: Current admin user
        
    Returns:
        Success message
    """
    try:
        await resource_service.delete_resource(id)
        return {"message": "Resource deleted successfully"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete resource")

@router.post("/{id}/deactivate", tags=["admin"])
async def deactivate_resource(
    id: int,
    current_user = Depends(require_admin)
):
    """Deactivate a resource (admin only)"""
    try:
        return await resource_service.deactivate_resource(id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deactivating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to deactivate resource")

@router.post("/{id}/reactivate", tags=["admin"])
async def reactivate_resource(
    id: int,
    current_user = Depends(require_admin)
):
    """Reactivate a resource (admin only)"""
    try:
        return await resource_service.reactivate_resource(id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reactivating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reactivate resource")

# 3. 权限查询
@router.get("/actions")
async def get_available_actions(
    current_user = Depends(get_current_user)
) -> Dict[str, bool]:
    """Get available actions for current user"""
    return {
        "can_upload": True,
        "can_download": True,
        "can_update": True,
        "can_delete": current_user.is_admin,
        "can_review": current_user.is_admin,
        "can_manage_status": current_user.is_admin
    }

@router.get("/", response_model=List[ResourceInDB])
async def list_resources(
    limit: int = 10,
    offset: int = 0,
    is_admin: bool = False,
    current_user = Depends(get_current_user)
):
    """Get a list of resources
    
    Args:
        limit: Maximum number of resources to return
        offset: Number of resources to skip
        is_admin: Whether to include pending resources (admin only)
        current_user: Current authenticated user
        
    Returns:
        List of resources
    """
    try:
        # 检查是否是管理员请求
        if is_admin and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
            
        # 调用服务层获取资源列表
        resources = await resource_service.list_resources(
            limit=limit,
            offset=offset,
            include_pending=is_admin and current_user.is_admin
        )
        return resources
    except Exception as e:
        logger.error(f"Error listing resources: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list resources") 