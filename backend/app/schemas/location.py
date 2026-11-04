"""Location Pydantic v2 schemas."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
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
    qr_identifier: str | None = None

    @model_validator(mode="wrap")
    @classmethod
    def populate_qr_identifier(cls, data: Any, handler):
        validated = handler(data)
        if hasattr(data, "qr_code") and data.qr_code:
            validated.qr_identifier = data.qr_code.identifier
        elif hasattr(data, "qr_identifier") and getattr(data, "qr_identifier"):
            validated.qr_identifier = getattr(data, "qr_identifier")
        return validated


class LocationDetailOut(LocationOut):
    is_open: bool | None = None
