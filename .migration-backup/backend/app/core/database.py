from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _build_engine():
    try:
        return create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True, future=True)
    except Exception:
        # Fallback to SQLite for development when PostgreSQL is not available
        try:
            return create_async_engine("sqlite+aiosqlite:///./aibrain.db", echo=True, future=True)
        except Exception:
            # Gracefully fall back to a simple in-process placeholder engine when optional DB drivers are missing.
            return None


engine = _build_engine()
AsyncSessionLocal = None
if engine is not None:
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Check if we're using SQLite
is_sqlite = engine and "sqlite" in str(engine.url) if engine else False


async def get_db() -> AsyncIterator[AsyncSession]:
    if AsyncSessionLocal is None:
        raise RuntimeError("Database engine is unavailable. Install the required database drivers or run with a configured database.")
    async with AsyncSessionLocal() as session:
        yield session
