from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from typing import List, Dict, Optional, Tuple
from datetime import timedelta
import logging
from fastapi.responses import StreamingResponse
import httpx
from api.models.resource import (
    ResourceBase, ResourceCreate, ResourceUpdate, 
    ResourceInDB, ResourceReview, ResourceStatus,
    ResourceRatingCreate
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

# define dependency function
async def get_resource_service():
    return ResourceService()

async def get_current_user(
    auth_service: AuthService = Depends(get_auth_service),
    token: str = Depends(security)
):
    return await auth_service.get_current_user(token.credentials) 

logger = setup_logger("resource_router", log_file="resource_router.log", level=logging.DEBUG)
logger.info("Resource router initialized")

@router.get("/actions")
async def get_available_actions(
    current_user = Depends(get_current_user)
) -> Dict[str, bool]:
    """Get available actions for current user"""
    try:
        is_admin = current_user.get("role") == "admin"
        
        actions = {
            "can_upload": True,  
            "can_download": True, 
            "can_update": True,  
            "can_rate": True, 
            "can_delete": is_admin, 
            "can_review": is_admin,
            "can_manage_status": is_admin, 
            "can_see_all_statuses": is_admin,
        }
        
        return actions
    except Exception as e:
        logger.error(f"Error getting available actions: {str(e)}")
        return {
            "can_upload": False,
            "can_download": False,
            "can_update": False,
            "can_delete": False,
            "can_review": False,
            "can_rate": False,
            "can_manage_status": False,
            "can_see_all_statuses": False,
        }

@router.get("/course-ids", response_model=List[str])
async def get_course_ids(
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Get all available course IDs"""
    try:
        course_ids = await resource_service.get_all_course_ids()
        return course_ids
    except Exception as e:
        logger.error(f"Error getting course IDs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get course IDs")

@router.post("/create", response_model=ResourceInDB)
async def create_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Create new resource"""
    try:
        is_admin = current_user.get("role") == "admin"
        initial_status = ResourceStatus.APPROVED if is_admin else ResourceStatus.PENDING
        
        resource_data = ResourceCreate(
            title=title,
            description=description,
            course_id=course_id,
            uploader_id=current_user.get("id"),
            original_filename=file.filename,
            status=initial_status
        )
        
        return await resource_service.create_resource(resource_data, file)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating resource: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/uploads")
async def get_upload_history(
    limit: int = 10,
    offset: int = 0,
    resource_service: ResourceService = Depends(get_resource_service),
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

@router.get("/{id}", response_model=ResourceInDB)
async def get_resource(
    id: int,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Get resource details"""
    logger.info(f"Received request to get resource with ID: {id}")
    try:
        is_admin = current_user.get("role") == "admin"
        include_pending = is_admin
        resource = await resource_service.get_resource_by_id(id, include_pending)
        
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
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Get resource download URL"""
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

@router.get("/{id}/download-file")
async def download_resource(
    id: int,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Download resource file directly"""
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

@router.get("", response_model=Dict)
async def list_resources(
    limit: Optional[int] = 10,
    offset: Optional[int] = 0,
    course_id: Optional[str] = None,
    search: Optional[str] = None,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """List resources with pagination"""
    try:
        is_admin = current_user.get("role") == "admin"
        include_pending = is_admin
        
        resources, total = await resource_service.list_resources(
            limit=limit,
            offset=offset,
            include_pending=include_pending,
            course_id=course_id
        )
        
        return {
            "items": resources,
            "total": total
        }
    except Exception as e:
        logger.error(f"Error listing resources: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list resources: {str(e)}")

@router.post("/{id}/rating")
async def rate_resource(
    id: int,
    rating_data: ResourceRatingCreate,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Rate a resource"""
    try:
        result = await resource_service.rate_resource(id, current_user.get("id"), rating_data)
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error rating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to rate resource")

@router.get("/{id}/rating")
async def get_user_rating(
    id: int,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Get current user's rating for a resource"""
    try:
        return await resource_service.get_user_rating(id, current_user.get("id"))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting user rating for resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get rating")

@router.patch("/{id}", response_model=ResourceInDB)
async def update_resource(
    id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(get_current_user)
):
    """Update resource details and optionally replace the file"""
    try:
        logger.info(f"Received update request for resource {id}")
        
        resource = await resource_service.get_resource_by_id(id, include_pending=True)
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
        
        result = await resource_service.update_resource(id, update_data, file)
        logger.info(f"Resource {id} updated successfully")
        return result
        
    except ValidationError as e:
        logger.error(f"Validation error updating resource {id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except NotFoundError as e:
        logger.warning(f"Resource not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except StorageError as e:
        logger.error(f"Storage error updating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update resource: {str(e)}")

@router.post("/{id}/review", response_model=ResourceInDB)
async def review_resource(
    id: int,
    review_data: ResourceReview,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(require_admin)
):
    """Review resource (admin only)"""
    try:
        logger.info(f"Received review request for resource {id}: {review_data.dict()}")
        logger.info(f"Current user: {current_user}")
        
        review = ResourceReview(
            status=review_data.status,
            review_comment=review_data.review_comment,
            reviewed_by=current_user.get("id")
        )
        resource = await resource_service.review_resource(id, review)
        return resource
    except NotFoundError as e:
        logger.error(f"Resource not found: {id}, error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error for resource {id}: {str(e)}")
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

@router.post("/{id}/deactivate", tags=["admin"])
async def deactivate_resource(
    id: int,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(require_admin)
):
    """Deactivate a resource (admin only)"""
    try:
        return await resource_service.deactivate_resource(id, current_user.get("id"))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deactivating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to deactivate resource")

@router.post("/{id}/reactivate", tags=["admin"])
async def reactivate_resource(
    id: int,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(require_admin)
):
    """Reactivate a resource (admin only)"""
    try:
        return await resource_service.reactivate_resource(id, current_user.get("id"))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reactivating resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reactivate resource")

@router.delete("/{id}", tags=["admin"])
async def delete_resource(
    id: int,
    resource_service: ResourceService = Depends(get_resource_service),
    current_user = Depends(require_admin)
):
    """Delete a resource (admin only)"""
    try:
        await resource_service.delete_resource(id)
        return {"message": "Resource deleted successfully"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting resource {id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete resource")