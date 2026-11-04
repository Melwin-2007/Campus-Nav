"""Health check API router."""

from fastapi import APIRouter, status
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Liveness Health Check",
    description="Returns HTTP 200 with status ok indicating that the FastAPI backend application is operational.",
)
async def get_health() -> HealthResponse:
    """Liveness probe returning operational status."""
    return HealthResponse(status="ok")
