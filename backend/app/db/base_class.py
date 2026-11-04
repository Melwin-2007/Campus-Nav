"""SQLAlchemy 2.0 Base declarative class."""

from datetime import datetime, timezone
from sqlalchemy.orm import DeclarativeBase


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Declarative Base class for all SQLAlchemy mapped models."""
    pass
