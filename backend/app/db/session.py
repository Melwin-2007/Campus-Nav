"""Database session, engine configuration, and connection lifecycle."""

from collections.abc import Generator
from contextlib import contextmanager
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Engine configuration
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.DB_ECHO,
)

# SQLite-specific connection pragma hooks
if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # Enable Foreign Key constraint enforcement
        cursor.execute("PRAGMA foreign_keys = ON;")
        # Enable Write-Ahead Logging for non-blocking concurrent reads
        cursor.execute("PRAGMA journal_mode = WAL;")
        # Fast synchronization balancing integrity and test execution speed
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.close()

# Sessionmaker factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI route dependency yielding a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager for seed scripts, migration tools, and standalone jobs."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
