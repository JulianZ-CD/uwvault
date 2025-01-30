from fastapi import FastAPI
from api.routers.auth_router import router as auth_router

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")


app.include_router(auth_router, prefix="/api/py")


@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}
