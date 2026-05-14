"""
PostgreSQL async driver (asyncpg + SQLAlchemy 2.x).

Схема БД — через Alembic (см. backend/alembic, вызов при старте в app.main).
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from ..config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency: открывает сессию, закрывает после ответа."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
