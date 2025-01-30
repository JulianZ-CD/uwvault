from fastapi import APIRouter
from api.routers import auth

# create main router
api_router = APIRouter(prefix="/api/py")

# register auth router
api_router.include_router(auth.router)

# TODO: add other routers later
