from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from api.routers.auth_router import router as auth_router
from api.routers.todo_router import router as todo_router
from api.routers.resources_router import router as resources_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

# add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# add global middleware
@app.middleware("http")
async def handle_auth_errors(request: Request, call_next):
    try:
        # execute request processing
        response = await call_next(request)
        
        # handle 422 authentication errors
        if response.status_code == 422 and "/api/py/resources/actions" in request.url.path:
            # replace with default response
            return JSONResponse(
                status_code=200,
                content={
                    "can_upload": True,
                    "can_download": True,
                    "can_update": True,
                    "can_delete": True,
                    "can_review": True,
                    "can_manage_status": True
                }
            )
        
        return response
    except Exception as e:
        # handle uncaught exceptions
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )


app.include_router(auth_router)
app.include_router(todo_router)
app.include_router(resources_router)

@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}
