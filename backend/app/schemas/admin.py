"""Administrator and Authentication Pydantic v2 schemas."""

from datetime import datetime
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
