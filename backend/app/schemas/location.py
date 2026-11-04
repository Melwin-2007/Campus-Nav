"""Location Pydantic v2 schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryOut
from app.schemas.path_node import PathNodeOut


class LocationBase(BaseModel):
    category_id: int
    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    department: str | None = Field(None, max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    entrance_node_id: int | None = None
    opening_hours: str | None = Field(None, max_length=100)
    facilities: list[str] = Field(default_factory=list)
    photo_url: str | None = Field(None, max_length=255)
    is_active: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(None, min_length=2, max_length=150)
    description: str | None = None
    department: str | None = Field(None, max_length=100)
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)
    entrance_node_id: int | None = None
    opening_hours: str | None = Field(None, max_length=100)
    facilities: list[str] | None = None
    photo_url: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class LocationOut(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    category: CategoryOut | None = None
    entrance_node: PathNodeOut | None = None


class LocationDetailOut(LocationOut):
    is_open: bool | None = None
