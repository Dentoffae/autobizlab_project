"""
LeadBehavior — поведенческая аналитика посетителя (1:1 с Lead).

SQL (генерируется через Base.metadata.create_all):
    CREATE TABLE lead_behaviors (
        id              SERIAL PRIMARY KEY,
        lead_id         INTEGER UNIQUE NOT NULL
                            REFERENCES leads(id) ON DELETE CASCADE,

        -- Временны́е метрики
        time_on_page    INTEGER,        -- секунд на странице
        form_fill_time  INTEGER,        -- секунд на заполнение формы

        -- Карта активности (JSON-строки)
        buttons_clicked TEXT,           -- ["btn_audit", "faq_q1", …]
        cursor_hovers   TEXT,           -- ["#hero", "#price", …]
        click_map       TEXT,           -- {selector: count}

        -- Прочее
        scroll_depth    INTEGER,        -- % прокрутки страницы (0–100)
        return_count    INTEGER DEFAULT 0,  -- кол-во возвратов на страницу
        screen_resolution VARCHAR(50),
        timezone        VARCHAR(100),

        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
"""
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from ..core.database import Base


class LeadBehavior(Base):
    __tablename__ = "lead_behaviors"
    __table_args__ = (
        UniqueConstraint("lead_id", name="uq_lead_behaviors_lead_id"),
    )

    id:               Mapped[int]       = mapped_column(Integer, primary_key=True, index=True)
    lead_id:          Mapped[int]       = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Временны́е метрики
    time_on_page:     Mapped[int | None] = mapped_column(Integer)
    form_fill_time:   Mapped[int | None] = mapped_column(Integer)

    # Карта активности
    buttons_clicked:  Mapped[str | None] = mapped_column(Text)  # JSON array
    cursor_hovers:    Mapped[str | None] = mapped_column(Text)  # JSON array
    click_map:        Mapped[str | None] = mapped_column(Text)  # JSON object

    # Прочее
    scroll_depth:     Mapped[int | None] = mapped_column(Integer)
    return_count:     Mapped[int | None] = mapped_column(Integer, server_default="0")
    screen_resolution:Mapped[str | None] = mapped_column(String(50))
    timezone:         Mapped[str | None] = mapped_column(String(100))

    created_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────
# CRUD-операции
# ─────────────────────────────────────────────
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession


class BehaviorCRUD:
    """Набор статических методов для управления записями LeadBehavior."""

    @staticmethod
    async def create(db: AsyncSession, lead_id: int, **kwargs) -> LeadBehavior:
        rec = LeadBehavior(lead_id=lead_id, **{k: v for k, v in kwargs.items() if hasattr(LeadBehavior, k)})
        db.add(rec)
        await db.commit()
        await db.refresh(rec)
        return rec

    @staticmethod
    async def get_by_lead_id(db: AsyncSession, lead_id: int) -> LeadBehavior | None:
        result = await db.execute(
            select(LeadBehavior).where(LeadBehavior.lead_id == lead_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update(db: AsyncSession, rec: LeadBehavior, **kwargs) -> LeadBehavior:
        for key, value in kwargs.items():
            if hasattr(LeadBehavior, key) and value not in (None, ""):
                setattr(rec, key, value)
        rec.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(rec)
        return rec

    @staticmethod
    async def upsert(db: AsyncSession, lead_id: int, **kwargs) -> LeadBehavior:
        """Создать или обновить запись поведения для данного лида."""
        rec = await BehaviorCRUD.get_by_lead_id(db, lead_id)
        if rec:
            return await BehaviorCRUD.update(db, rec, **kwargs)
        return await BehaviorCRUD.create(db, lead_id=lead_id, **kwargs)

    @staticmethod
    async def delete_for_lead(db: AsyncSession, lead_id: int) -> None:
        """Удалить аналитику по лиду (до удаления строки лида из-за возможного FK без CASCADE)."""
        await db.execute(delete(LeadBehavior).where(LeadBehavior.lead_id == lead_id))
