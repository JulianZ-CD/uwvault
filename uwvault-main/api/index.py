from fastapi import FastAPI
from api.routers.auth_router import router as auth_router
from api.routers.todo_router import router as todo_router
from api.routers.course_router import router as course_router

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")


app.include_router(auth_router)
app.include_router(todo_router)
app.include_router(course_router)


@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}
