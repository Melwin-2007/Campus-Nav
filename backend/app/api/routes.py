"""FastAPI Router for route calculation."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.routing import RouteRequest, RouteResponse
from app.services.routing import RoutingService

router = APIRouter(tags=["Routing"])


@router.post(
    "/routes",
    response_model=RouteResponse,
    summary="Compute optimal campus navigation route",
    description="Calculates shortest path using Dijkstra or A* with accessibility filtering, coordinate snapping, and turn-by-turn instructions.",
)
def compute_route(
    request: RouteRequest,
    db: Session = Depends(get_db),
) -> RouteResponse:
    service = RoutingService(db)
    return service.calculate_route(request)
