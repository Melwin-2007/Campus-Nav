"""FastAPI application initialization and routing."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.admin import router as admin_router
from app.api.categories import router as categories_router
from app.api.health import router as health_router
from app.api.locations import router as locations_router
from app.api.qr import router as qr_router
from app.api.routes import router as routes_router
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Mount Routers under /api
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(routes_router, prefix=settings.API_PREFIX)
app.include_router(categories_router, prefix=settings.API_PREFIX)
app.include_router(locations_router, prefix=settings.API_PREFIX)
app.include_router(qr_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint verifying API operational status."""
    return {
        "message": "Campus Navigator API is operational",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
    }


@app.get("/health", tags=["Root"], include_in_schema=False)
async def root_health_alias():
    """Root-level alias for health probe."""
    return {"status": "ok"}
