"""Administrator and Authentication Pydantic v2 schemas."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr = Field(...)
    is_active: bool = True
    is_superuser: bool = False


class AdminCreate(AdminBase):
    password: str = Field(..., min_length=6)


class AdminUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=6)
    is_active: bool | None = None
    is_superuser: bool | None = None


class AdminOut(AdminBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str | None = None
    exp: int | None = None


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminStats(BaseModel):
    total_locations: int
    total_categories: int
    total_nodes: int
    total_edges: int
    total_qr_codes: int
    total_issues: int
    locations_count: int
    categories_count: int
    nodes_count: int
    edges_count: int
    qr_codes_count: int
    issues_count: int
    health_status: str  # "healthy" | "warning" | "critical"


class DataHealthReport(BaseModel):
    status: str  # "healthy" | "warning" | "critical"
    total_issues: int
    isolated_nodes: list[dict[str, Any]]
    locations_missing_entrance: list[dict[str, Any]]
    suspect_edges: list[dict[str, Any]]
    orphaned_qr_codes: list[dict[str, Any]]
    summary: dict[str, int]


class PhotoUploadResponse(BaseModel):
    status: str
    location_id: int
    photo_url: str
    filename: str
    size_bytes: int


class DeleteResponse(BaseModel):
    status: str
    id: int
    entity: str
