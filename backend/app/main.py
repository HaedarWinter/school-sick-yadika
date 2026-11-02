from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from .config import settings
from .models import Base
from .database import engine
from .routers.api import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="Catch-a-Paw API", lifespan=lifespan)

@app.middleware("http")
async def block_llm_probes(request: Request, call_next):
    if request.url.path.startswith("/v1/models"):
        return Response(status_code=404)
    return await call_next(request)

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.get("/health")
async def health():
    return {"ok": True}