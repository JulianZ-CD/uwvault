from fastapi import FastAPI
from api.routers.auth_router import router as auth_router
from api.routers.todo_router import router as todo_router

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")


app.include_router(auth_router, prefix="/api/py")
app.include_router(todo_router, prefix="/api/py")


@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}
