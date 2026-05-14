"""
Портфолио: примеры лендингов и кейсы.

SQL:
    CREATE TABLE landing_examples (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        category    VARCHAR(100),
        description TEXT,
        image_url   TEXT,
        link_url    TEXT,
        sort_order  INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE case_studies (
        id              SERIAL PRIMARY KEY,
        title           VARCHAR(255) NOT NULL,
        industry        VARCHAR(100),
        description     TEXT,
        result_metric   VARCHAR(100),   -- например «+373%»
        result_label    VARCHAR(200),   -- например «рост заявок»
        extra_metrics   TEXT,           -- JSON-строка доп. метрик
        is_featured     BOOLEAN DEFAULT FALSE,
        sort_order      INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW()
    );
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from ..core.database import Base

# ─────────────────────────────────────────────────────────────────────
# Модели
# ─────────────────────────────────────────────────────────────────────

class LandingExample(Base):
    __tablename__ = "landing_examples"

    id:             Mapped[int]        = mapped_column(Integer, primary_key=True, index=True)
    title:          Mapped[str]        = mapped_column(String(255), nullable=False)
    title_en:       Mapped[str | None] = mapped_column(String(255))
    category:       Mapped[str | None] = mapped_column(String(100))
    category_en:    Mapped[str | None] = mapped_column(String(100))
    description:    Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    image_url:      Mapped[str | None] = mapped_column(Text)
    link_url:       Mapped[str | None] = mapped_column(Text)
    sort_order:     Mapped[int]        = mapped_column(Integer, default=0)
    is_active:      Mapped[bool]       = mapped_column(Boolean, default=True)
    created_at:     Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())


class CaseStudy(Base):
    __tablename__ = "case_studies"

    id:               Mapped[int]        = mapped_column(Integer, primary_key=True, index=True)
    title:            Mapped[str]        = mapped_column(String(255), nullable=False)
    title_en:         Mapped[str | None] = mapped_column(String(255))
    industry:         Mapped[str | None] = mapped_column(String(100))
    industry_en:      Mapped[str | None] = mapped_column(String(100))
    description:      Mapped[str | None] = mapped_column(Text)
    description_en:   Mapped[str | None] = mapped_column(Text)
    result_metric:    Mapped[str | None] = mapped_column(String(100))
    result_label:     Mapped[str | None] = mapped_column(String(200))
    result_label_en:  Mapped[str | None] = mapped_column(String(200))
    extra_metrics:    Mapped[str | None] = mapped_column(Text)
    extra_metrics_en: Mapped[str | None] = mapped_column(Text)
    is_featured:      Mapped[bool]        = mapped_column(Boolean, default=False)
    sort_order:       Mapped[int]         = mapped_column(Integer, default=0)
    created_at:       Mapped[datetime]    = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────────────────────────────────

class LandingCRUD:
    @staticmethod
    async def get_all(db: AsyncSession, active_only: bool = True) -> list[LandingExample]:
        q = select(LandingExample).order_by(LandingExample.sort_order, LandingExample.id)
        if active_only:
            q = q.where(LandingExample.is_active.is_(True))
        return list((await db.execute(q)).scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, item_id: int) -> LandingExample | None:
        return (await db.execute(select(LandingExample).where(LandingExample.id == item_id))).scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> LandingExample:
        obj = LandingExample(**{k: v for k, v in kwargs.items() if hasattr(LandingExample, k)})
        db.add(obj); await db.commit(); await db.refresh(obj)
        return obj

    @staticmethod
    async def update(db: AsyncSession, item_id: int, **kwargs) -> LandingExample | None:
        obj = await LandingCRUD.get_by_id(db, item_id)
        if not obj:
            return None
        for k, v in kwargs.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        await db.commit(); await db.refresh(obj)
        return obj

    @staticmethod
    async def delete(db: AsyncSession, item_id: int) -> bool:
        obj = await LandingCRUD.get_by_id(db, item_id)
        if not obj:
            return False
        await db.delete(obj); await db.commit()
        return True


class CaseCRUD:
    @staticmethod
    async def get_all(db: AsyncSession) -> list[CaseStudy]:
        q = select(CaseStudy).order_by(CaseStudy.sort_order, CaseStudy.id)
        return list((await db.execute(q)).scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, item_id: int) -> CaseStudy | None:
        return (await db.execute(select(CaseStudy).where(CaseStudy.id == item_id))).scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> CaseStudy:
        obj = CaseStudy(**{k: v for k, v in kwargs.items() if hasattr(CaseStudy, k)})
        db.add(obj); await db.commit(); await db.refresh(obj)
        return obj

    @staticmethod
    async def update(db: AsyncSession, item_id: int, **kwargs) -> CaseStudy | None:
        obj = await CaseCRUD.get_by_id(db, item_id)
        if not obj:
            return None
        for k, v in kwargs.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        await db.commit(); await db.refresh(obj)
        return obj

    @staticmethod
    async def delete(db: AsyncSession, item_id: int) -> bool:
        obj = await CaseCRUD.get_by_id(db, item_id)
        if not obj:
            return False
        await db.delete(obj); await db.commit()
        return True
