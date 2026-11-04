"""PathEdge Pydantic v2 schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class PathEdgeBase(BaseModel):
    from_node_id: int
    to_node_id: int
    distance: float = Field(..., ge=0.0)
    edge_type: str = Field(default="footpath", max_length=50)
    is_accessible: bool = True
    is_bidirectional: bool = True
    is_active: bool = True

    @model_validator(mode="after")
    def check_not_self_loop(self):
        if self.from_node_id == self.to_node_id:
            raise ValueError("Edge cannot connect a node to itself (from_node_id != to_node_id)")
        return self


class PathEdgeCreate(PathEdgeBase):
    pass


class PathEdgeUpdate(BaseModel):
    from_node_id: int | None = None
    to_node_id: int | None = None
    distance: float | None = Field(None, ge=0.0)
    edge_type: str | None = Field(None, max_length=50)
    is_accessible: bool | None = None
    is_bidirectional: bool | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_not_self_loop(self):
        if self.from_node_id is not None and self.to_node_id is not None:
            if self.from_node_id == self.to_node_id:
                raise ValueError("Edge cannot connect a node to itself")
        return self


class PathEdgeOut(PathEdgeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
