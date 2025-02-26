from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from api.utils.logger import setup_logger
from api.models.course import CourseBase
from api.services.auth_course import AuthCourse

router =APIRouter(
    prefix="/api/py/course",
    tags=["course"]
)

course_service=AuthCourse()
logger=setup_logger("course_router","course_router.log")

@router.get("/allclass")
async def get_all_class() ->list[CourseBase]:
    try:
        return course_service.output_form_course()
    except Exception as e:
        logger.error(f"Error getting courses:{str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Fail to get courses"
        )