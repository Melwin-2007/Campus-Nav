"""FastAPI application initialization, routing, and SPA static hosting."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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

# CORS Middleware Configuration (Supporting Localhost, Render, and Custom Domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.BACKEND_CORS_ORIGINS),
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Mount API Routers under /api
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(routes_router, prefix=settings.API_PREFIX)
app.include_router(categories_router, prefix=settings.API_PREFIX)
app.include_router(locations_router, prefix=settings.API_PREFIX)
app.include_router(qr_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["Root"], include_in_schema=False)
async def root_health_alias():
    """Root-level alias for health probe (Render automated health check)."""
    return {"status": "ok"}


# Detect built frontend SPA (enables single-service full-stack deployment on Render)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    images_dir = os.path.join(frontend_dist, "images")
    if os.path.exists(images_dir):
        app.mount("/images", StaticFiles(directory=images_dir), name="frontend_images")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Do not intercept API, docs, or OpenAPI endpoints
        if full_path.startswith("api/") or full_path in ("api", "docs", "redoc", "openapi.json", "health"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", tags=["Root"])
    async def root():
        """Root endpoint verifying API operational status when SPA is not co-located."""
        return {
            "message": "Campus Navigator API is operational",
            "docs": "/docs",
            "health": f"{settings.API_PREFIX}/health",
        }
