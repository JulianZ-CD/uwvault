from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from api.utils.logger import setup_logger
from api.models.course import CourseBase
from api.models.course import CourseSearch
from api.services.auth_course_service import AuthCourse
from api.services.user_course_service import UserCourse

router =APIRouter(
    prefix="/api/py/course",
    tags=["course"]
)

course_service=AuthCourse()
user_course_service=UserCourse()
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

@router.post("/findclass")
async def find_course(course_index:CourseSearch)->list[CourseBase]:
    try:
        return user_course_service.find_course(course_index)
    except Exception as e:
        logger.error(f"Error getting courses:{str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Fail to get courses"
        )
    
@router.post("/findtask")
async def all_task():
    try:
        return user_course_service.all_tasks()
    except Exception as e:
        logger.error(f"Error getting courses:{str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Fail to get tasks"
        )   

@router.post("/findterm")
async def all_term():
    try:
        return user_course_service.all_terms()
    except Exception as e:
        logger.error(f"Error getting courses:{str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Fail to get terms"
        )   

@router.post("/findtitle")
async def all_title():
    try:
        return user_course_service.all_title()
    except Exception as e:
        logger.error(f"Error getting courses:{str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Fail to get tasks"
        )   


@router.post("/updateallclass")
async def up_date_allcass():
    try:
        return course_service.upload_course_to_supabase()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
