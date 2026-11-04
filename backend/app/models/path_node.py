"""PathNode model representing campus walkway intersections, gates, and entrances."""

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, utc_now

if TYPE_CHECKING:
    from app.models.location import Location
    from app.models.path_edge import PathEdge


class PathNode(Base):
    __tablename__ = "path_nodes"
    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="chk_node_latitude"),
        CheckConstraint("longitude >= -180.0 AND longitude <= 180.0", name="chk_node_longitude"),
        CheckConstraint("floor >= -5 AND floor <= 100", name="chk_node_floor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    floor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    node_type: Mapped[str] = mapped_column(
        String(50), default="junction", nullable=False
    )  # 'junction', 'entrance', 'gate', 'landmark'
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    outgoing_edges: Mapped[list["PathEdge"]] = relationship(
        "PathEdge",
        foreign_keys="[PathEdge.from_node_id]",
        back_populates="from_node",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    incoming_edges: Mapped[list["PathEdge"]] = relationship(
        "PathEdge",
        foreign_keys="[PathEdge.to_node_id]",
        back_populates="to_node",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    locations: Mapped[list["Location"]] = relationship(
        "Location",
        foreign_keys="[Location.entrance_node_id]",
        back_populates="entrance_node",
    )
