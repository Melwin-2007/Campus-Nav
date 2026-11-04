"""QRCode Pydantic v2 schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.location import LocationOut


class QRCodeBase(BaseModel):
    location_id: int
    identifier: str = Field(..., min_length=8, max_length=64)
    code_url: str = Field(..., max_length=255)


class QRCodeCreate(QRCodeBase):
    pass


class QRCodeOut(QRCodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    location: LocationOut | None = None
