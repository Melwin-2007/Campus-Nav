"""Pydantic v2 schemas for route calculation requests and responses."""

from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class RouteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    # Node Identifiers
    start_node_id: Optional[int] = Field(None, description="Starting graph node ID")
    destination_node_id: Optional[int] = Field(None, description="Destination graph node ID")

    # Coordinate fields with alias tolerance
    start_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    start_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)
    dest_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    dest_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)
    destination_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    destination_lon: Optional[float] = Field(None, ge=-180.0, le=180.0)

    # Array coordinate representations ([latitude, longitude])
    start_coords: Optional[List[float]] = Field(None, description="[lat, lon] pair")
    destination_coords: Optional[List[float]] = Field(None, description="[lat, lon] pair")

    # POI Location references
    start_location_id: Optional[int] = Field(None, description="Starting location POI ID")
    destination_location_id: Optional[int] = Field(None, description="Destination location POI ID")

    # Algorithmic options
    accessible_only: bool = Field(False, description="Enforce wheelchair accessible paths only")
    algorithm: str = Field("astar", description="Pathfinding algorithm: 'astar' or 'dijkstra'")

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Extract from start_coords if start_lat/lon not provided
            if data.get("start_coords") and len(data["start_coords"]) == 2:
                if data.get("start_lat") is None:
                    data["start_lat"] = data["start_coords"][0]
                if data.get("start_lon") is None:
                    data["start_lon"] = data["start_coords"][1]

            # Extract from destination_coords if dest_lat/lon not provided
            if data.get("destination_coords") and len(data["destination_coords"]) == 2:
                if data.get("dest_lat") is None and data.get("destination_lat") is None:
                    data["destination_lat"] = data["destination_coords"][0]
                    data["dest_lat"] = data["destination_coords"][0]
                if data.get("dest_lon") is None and data.get("destination_lon") is None:
                    data["destination_lon"] = data["destination_coords"][1]
                    data["dest_lon"] = data["destination_coords"][1]

            # Sync dest_lat and destination_lat
            if data.get("destination_lat") is not None and data.get("dest_lat") is None:
                data["dest_lat"] = data["destination_lat"]
            elif data.get("dest_lat") is not None and data.get("destination_lat") is None:
                data["destination_lat"] = data["dest_lat"]

            if data.get("destination_lon") is not None and data.get("dest_lon") is None:
                data["dest_lon"] = data["destination_lon"]
            elif data.get("dest_lon") is not None and data.get("destination_lon") is None:
                data["destination_lon"] = data["dest_lon"]

        return data

    @field_validator("algorithm")
    @classmethod
    def validate_algorithm(cls, v: str) -> str:
        algo = v.strip().lower()
        if algo not in ("astar", "dijkstra"):
            raise ValueError("Algorithm must be either 'astar' or 'dijkstra'")
        return algo


class RouteStep(BaseModel):
    step_number: int = Field(1, description="Sequential instruction index")
    instruction: str = Field(..., description="Human-readable turn direction")
    action: str = Field(..., description="Action token for icon mapping")
    maneuver: str = Field(..., description="Synonym for action")
    distance_meters: float = Field(..., description="Walk distance for this step")
    duration_seconds: int = Field(0, description="Estimated walking time for this step")
    bearing: float = Field(0.0, description="Forward azimuth in degrees [0, 360)")
    lat: float = Field(..., description="Step starting latitude")
    lon: float = Field(..., description="Step starting longitude")
    coordinates: List[float] = Field(default_factory=list, description="[lat, lon]")
    location_name: Optional[str] = Field(None, description="Associated POI or landmark name")


class RouteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    # Distance metrics
    distance_meters: float = Field(..., description="Total route distance in meters")
    total_distance_meters: float = Field(..., description="Total distance alias")

    # Time estimates
    duration_minutes: int = Field(..., description="Estimated walking time in minutes")
    duration_seconds: int = Field(..., description="Estimated walking time in seconds")
    estimated_time_seconds: int = Field(..., description="Duration seconds alias")

    # Algorithm & Accessibility metadata
    algorithm_used: str = Field(..., description="Pathfinding algorithm employed")
    accessible_only: bool = Field(..., description="Wheelchair accessibility constraint")
    is_accessible: bool = Field(..., description="Accessibility alias")

    # Topological path resolution
    start_node_id: int = Field(..., description="Resolved starting node ID")
    destination_node_id: int = Field(..., description="Resolved destination node ID")
    path_node_ids: List[int] = Field(..., description="Ordered list of node IDs")
    path_nodes: List[int] = Field(..., description="Path node IDs alias")
    coordinates: List[List[float]] = Field(..., description="Polyline [[lat, lon], ...]")

    # Navigation steps
    steps: List[RouteStep] = Field(..., description="Turn-by-turn navigation instructions")
    snapped_distance_meters: Optional[float] = Field(None, description="GPS snap distance")
