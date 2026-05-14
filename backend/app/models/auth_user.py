"""
AdminUser — учётная запись администратора панели управления.

SQL (генерируется через Base.metadata.create_all):
    CREATE TABLE admin_users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(256)        NOT NULL,
        totp_secret   VARCHAR(64),
        created_at    TIMESTAMPTZ         DEFAULT NOW()
    );
"""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, select
from sqlalchemy import func as sql_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id:            Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    username:      Mapped[str]      = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str]      = mapped_column(String(256), nullable=False)
    totp_secret:   Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=sql_func.now())


class AdminUserCRUD:
    @staticmethod
    async def count(db: AsyncSession) -> int:
        result = await db.execute(select(sql_func.count()).select_from(AdminUser))
        return result.scalar_one()

    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> AdminUser | None:
        result = await db.execute(
            select(AdminUser).where(AdminUser.username == username)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, username: str, password_hash: str) -> AdminUser:
        user = AdminUser(username=username, password_hash=password_hash)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def set_totp_secret(db: AsyncSession, user: AdminUser, secret: str | None) -> AdminUser:
        user.totp_secret = secret
        await db.commit()
        await db.refresh(user)
        return user
