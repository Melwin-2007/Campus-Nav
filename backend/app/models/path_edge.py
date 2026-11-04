"""PathEdge model representing pedestrian walkway segments between nodes."""

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, utc_now

if TYPE_CHECKING:
    from app.models.path_node import PathNode


class PathEdge(Base):
    __tablename__ = "path_edges"
    __table_args__ = (
        CheckConstraint("distance >= 0.0", name="chk_edge_distance_non_negative"),
        CheckConstraint("from_node_id != to_node_id", name="chk_edge_no_self_loop"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    from_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("path_nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("path_nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    distance: Mapped[float] = mapped_column(Float, nullable=False)
    edge_type: Mapped[str] = mapped_column(
        String(50), default="footpath", nullable=False
    )  # 'footpath', 'ramp', 'stairs', 'road', 'corridor'
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_bidirectional: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    from_node: Mapped["PathNode"] = relationship(
        "PathNode", foreign_keys=[from_node_id], back_populates="outgoing_edges"
    )
    to_node: Mapped["PathNode"] = relationship(
        "PathNode", foreign_keys=[to_node_id], back_populates="incoming_edges"
    )
