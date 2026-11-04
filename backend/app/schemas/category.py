"""Category Pydantic v2 schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: str | None = None
    icon: str = Field(..., min_length=2, max_length=50)
    color: str = Field(..., pattern=r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    slug: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = None
    icon: str | None = Field(None, min_length=2, max_length=50)
    color: str | None = Field(None, pattern=r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
    is_active: bool | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    location_count: int = 0
