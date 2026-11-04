"""PathNode Pydantic v2 schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PathNodeBase(BaseModel):
    name: str | None = Field(None, max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    floor: int = Field(default=0, ge=-5, le=100)
    node_type: str = Field(default="junction", max_length=50)
    is_accessible: bool = True
    is_active: bool = True


class PathNodeCreate(PathNodeBase):
    pass


class PathNodeUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)
    floor: int | None = Field(None, ge=-5, le=100)
    node_type: str | None = Field(None, max_length=50)
    is_accessible: bool | None = None
    is_active: bool | None = None


class PathNodeOut(PathNodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
