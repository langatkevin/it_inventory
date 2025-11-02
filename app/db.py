from collections.abc import Generator
from typing import Any

from sqlalchemy import Engine, event
from sqlalchemy.engine import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_database_url


class Base(DeclarativeBase):
    """Base class for ORM models."""


def _create_engine(echo: bool = False) -> Engine:
    """Create a SQLAlchemy engine."""

    engine_url = get_database_url()
    connect_args: dict[str, Any] = {}

    if engine_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    return create_engine(
        engine_url,
        future=True,
        echo=echo,
        connect_args=connect_args,
    )


engine = _create_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
    class_=Session,
)


@event.listens_for(Engine, "connect")
def _set_sqlite_foreign_keys(dbapi_connection, connection_record):  # type: ignore[override]
    """Enable foreign key constraints for SQLite."""

    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency to provide a transactional database session."""

    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create database tables."""

    from . import models  # noqa: F401  # ensure models are imported for metadata

    models  # keep lint happy
    Base.metadata.create_all(bind=engine)
