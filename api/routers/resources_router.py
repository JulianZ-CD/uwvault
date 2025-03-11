from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from typing import List, Dict, Optional, Tuple
from datetime import timedelta
import logging
from fastapi.responses import StreamingResponse
import httpx
from api.models.resource import (
    ResourceBase, ResourceCreate, ResourceUpdate, 
    ResourceInDB, ResourceReview, ResourceStatus
)
from api.services.resource_service import ResourceService
from api.routers.auth_router import get_auth_service, require_admin, security
from api.core.exceptions import NotFoundError, ValidationError, StorageError
from api.utils.logger import setup_logger
from api.services.auth_service import AuthService

router = APIRouter(
    prefix="/api/py/resources",
    tags=["resources"]
)

resource_service = ResourceService()
logger = setup_logger("resource_router", log_file="resource_router.log", level=logging.DEBUG)

logger.info("Resource router initialized")

async def get_current_user(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    """Get current authenticated user"""
    return await auth_service.get_current_user(token.credentials) 

# 1. basic resource operations (all users available)
@router.get("/{id}", response_model=ResourceInDB)
async def get_resource(
    id: int,
    current_user = Depends(get_current_user)
):
    """Get resource details"""
    logger.info(f"Received request to get resource with ID: {id}")
    try:
        is_admin = current_user.get("role") == "admin"
        include_pending = is_admin  # 只有管理员可以看到非APPROVED状态的资源
        
        resource = await resource_service.get_resource_by_id(id, include_pending)
        
        # 如果不是管理员且资源不是APPROVED状态，检查是否是资源创建者
        if not is_admin and resource.status != ResourceStatus.APPROVED:
            if resource.created_by != current_user.get("id"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view this resource"
                )
        
        return resource
    except NotFoundError as e:
        logger.warning(f"Resource not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting resource {id}: {str(e)}", exc_info=True)
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
    """Create new resource"""
    try:
        # 检查用户是否为管理员
        is_admin = getattr(current_user, 'is_admin', False)
        
        resource_data = ResourceCreate(
            title=title,
            description=description,
            course_id=course_id,
            uploader_id=current_user.id,
            original_filename=file.filename,
            is_admin=is_admin  # 传递管理员状态
        )
        
        return await resource_service.create_resource(resource_data, file)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/uploads")
async def get_upload_history(
    limit: int = 10,
    offset: int = 0,
    current_user = Depends(get_current_user)
):
    """Get current user's upload history"""
    try:
        resources, total = await resource_service.get_user_uploads(
            user_id=current_user.get("id"),
            limit=limit,
            offset=offset
        )
        return {
            "items": resources,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error getting upload history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get upload history")

@router.patch("/{id}", response_model=ResourceInDB)
async def update_resource(
    id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """Update resource details"""
    try:
        # 获取资源以检查所有权和状态
        resource = await resource_service.get_resource_by_id(id, include_pending=True)
        
        # 检查权限：
        # 1. 管理员可以更新任何资源
        # 2. 普通用户只能更新自己创建的、非APPROVED状态的资源
        is_admin = current_user.get("role") == "admin"
        is_owner = resource.created_by == current_user.get("id")
        is_approved = resource.status == ResourceStatus.APPROVED
        
        if not is_admin and (not is_owner or is_approved):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this resource"
            )
        
        update_data = ResourceUpdate(
            title=title,
            description=description,
            course_id=course_id,
            updated_by=current_user.get("id")
        )
        return await resource_service.update_resource(id, update_data)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update resource")

# 2. admin functions
@router.post("/{id}/review", response_model=ResourceInDB)
async def review_resource(
    id: int,
    review_data: ResourceReview,
    current_user = Depends(require_admin)
):
    """Review resource (admin only)"""
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

# 3. permission query
@router.get("/actions")
async def get_available_actions(
    current_user = Depends(get_current_user)
) -> Dict[str, bool]:
    """Get available actions for current user"""
    is_admin = current_user.get("role") == "admin"
    
    actions = {
        "can_upload": True,  # 所有用户都可以上传
        "can_download": True,  # 所有用户都可以下载
        "can_update": True,  # 普通用户只能更新非APPROVED状态的自己的资源
        "can_delete": is_admin,  # 只有管理员可以删除
        "can_review": is_admin,  # 只有管理员可以审核
        "can_manage_status": is_admin,  # 只有管理员可以管理状态
        "can_see_all_statuses": is_admin  # 只有管理员可以看到所有状态
    }
    
    return actions

@router.get("/", response_model=dict)
async def list_resources(
    request: Request,
    limit: int = 10,
    offset: int = 0,
    current_user = Depends(get_current_user)
):
    """Get a list of resources"""
    try:
        is_admin = current_user.get("role") == "admin"
        include_pending = is_admin  # 只有管理员可以看到所有状态的资源
        
        resources, total_count = await resource_service.list_resources(
            limit=limit,
            offset=offset,
            include_pending=include_pending
        )
        
        return {
            "items": resources,
            "total": total_count
        }
    except Exception as e:
        logger.error(f"Error listing resources: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list resources: {str(e)}")

@router.get("/{id}/download-file")
async def download_resource(
    id: int,
    current_user = Depends(get_current_user)
):
    """Download resource file directly
    
    Args:
        id: Resource ID
        current_user: Current authenticated user
        
    Returns:
        StreamingResponse with the file content
    """
    try:
        url = await resource_service.get_resource_url(
            id,
            expiration=timedelta(minutes=30)
        )
        
        resource = await resource_service.get_resource_by_id(id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            
            filename = resource.storage_path.split('/')[-1]
            
            return StreamingResponse(
                content=response.aiter_bytes(),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
    except NotFoundError as e:
        logger.error(f"Error downloading resource {id}: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))        
    except Exception as e:
        logger.error(f"Error downloading resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download resource")