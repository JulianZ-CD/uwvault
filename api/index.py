from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers.api_router import api_router

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}
