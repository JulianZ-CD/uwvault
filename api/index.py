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

app.include_router(auth_router)
app.include_router(todo_router)
app.include_router(resources_router)

@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}
