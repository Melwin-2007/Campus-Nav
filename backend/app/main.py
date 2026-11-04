"""FastAPI application initialization and routing."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import engine
from app.api.health import router as health_router


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

# Mount Health router under /api
app.include_router(health_router, prefix=settings.API_PREFIX)


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
