"""Location model representing campus Points of Interest (POIs)."""

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, utc_now

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.path_node import PathNode
    from app.models.qr_code import QRCode


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        CheckConstraint("latitude >= -90.0 AND latitude <= 90.0", name="chk_location_latitude"),
        CheckConstraint("longitude >= -180.0 AND longitude <= 180.0", name="chk_location_longitude"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    entrance_node_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("path_nodes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    opening_hours: Mapped[str | None] = mapped_column(String(100), nullable=True)
    facilities: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="locations")
    entrance_node: Mapped["PathNode | None"] = relationship(
        "PathNode", foreign_keys=[entrance_node_id], back_populates="locations"
    )
    qr_code: Mapped["QRCode | None"] = relationship(
        "QRCode",
        back_populates="location",
        cascade="all, delete-orphan",
        uselist=False,
        passive_deletes=True,
    )
