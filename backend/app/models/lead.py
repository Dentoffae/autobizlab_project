"""
Lead — основная таблица клиентских заявок.

SQL (генерируется через Base.metadata.create_all):
    CREATE TABLE leads (
        id                  SERIAL PRIMARY KEY,

        -- Контактные данные
        first_name          VARCHAR(100),
        last_name           VARCHAR(100),
        middle_name         VARCHAR(100),
        phone               VARCHAR(50)  NOT NULL,
        email               VARCHAR(255),

        -- Информация о бизнесе
        business_niche      VARCHAR(255),   -- ниша / сфера
        company_size        VARCHAR(100),   -- кол-во сотрудников
        task_volume         VARCHAR(100),   -- объём задачи
        role                VARCHAR(100),   -- сотрудник / руководитель / владелец
        business_info       TEXT,           -- свободное описание

        -- Детали задачи
        budget              VARCHAR(100),   -- выбранный диапазон бюджета
        timeline            VARCHAR(100),   -- когда нужен результат
        task_type           VARCHAR(255),   -- тип задачи
        interested_product  VARCHAR(255),   -- интересующий продукт

        -- Коммуникация
        contact_preference  VARCHAR(100),   -- WhatsApp / Telegram / Email / …
        preferred_time      VARCHAR(100),   -- удобное время
        comments            TEXT,
        admin_notes         TEXT,           -- внутренние заметки администратора
        privacy_consent     BOOLEAN       DEFAULT FALSE,  -- согласие на обработку ПДн
        privacy_consent_at  TIMESTAMPTZ,  -- когда зафиксировано согласие

        -- Служебные
        source              VARCHAR(20)   DEFAULT 'quick',  -- 'quick' | 'enquire'
        language            VARCHAR(10),
        referrer            TEXT,
        utm_source          VARCHAR(255),
        utm_medium          VARCHAR(255),
        utm_campaign        VARCHAR(255),
        ip_address          VARCHAR(45),
        user_agent          TEXT,
        created_at          TIMESTAMPTZ   DEFAULT NOW(),
        updated_at          TIMESTAMPTZ   DEFAULT NOW()
    );

    CREATE INDEX leads_phone_idx ON leads (phone);
    CREATE INDEX leads_email_idx ON leads (email);
"""
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    and_,
    delete,
    func,
    or_,
    select,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id:                 Mapped[int]       = mapped_column(Integer, primary_key=True, index=True)

    # Контакты
    first_name:         Mapped[str | None] = mapped_column(String(100))
    last_name:          Mapped[str | None] = mapped_column(String(100))
    middle_name:        Mapped[str | None] = mapped_column(String(100))
    phone:              Mapped[str]        = mapped_column(String(50), nullable=False, index=True)
    email:              Mapped[str | None] = mapped_column(String(255), index=True)

    # Бизнес
    business_niche:     Mapped[str | None] = mapped_column(String(255))
    company_size:       Mapped[str | None] = mapped_column(String(100))
    task_volume:        Mapped[str | None] = mapped_column(String(100))
    role:               Mapped[str | None] = mapped_column(String(100))
    business_info:      Mapped[str | None] = mapped_column(Text)

    # Задача
    budget:             Mapped[str | None] = mapped_column(String(100))
    timeline:           Mapped[str | None] = mapped_column(String(100))
    task_type:          Mapped[str | None] = mapped_column(String(255))
    interested_product: Mapped[str | None] = mapped_column(String(255))

    # Коммуникация
    contact_preference: Mapped[str | None] = mapped_column(String(100))
    preferred_time:     Mapped[str | None] = mapped_column(String(100))
    comments:           Mapped[str | None] = mapped_column(Text)
    admin_notes:       Mapped[str | None] = mapped_column(Text)
    privacy_consent:   Mapped[bool]       = mapped_column(Boolean, nullable=False, server_default=text('false'))
    privacy_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Служебные
    source:             Mapped[str | None] = mapped_column(String(20), server_default="quick")
    language:           Mapped[str | None] = mapped_column(String(10))
    referrer:           Mapped[str | None] = mapped_column(Text)
    utm_source:         Mapped[str | None] = mapped_column(String(255))
    utm_medium:         Mapped[str | None] = mapped_column(String(255))
    utm_campaign:       Mapped[str | None] = mapped_column(String(255))
    ip_address:         Mapped[str | None] = mapped_column(String(45))
    user_agent:         Mapped[str | None] = mapped_column(Text)

    created_at:         Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:         Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────
# CRUD-операции
# ─────────────────────────────────────────────
from sqlalchemy.ext.asyncio import AsyncSession


class LeadCRUD:
    """Набор статических методов для управления записями Lead."""

    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> Lead:
        """Создать новую заявку."""
        lead = Lead(**{k: v for k, v in kwargs.items() if hasattr(Lead, k)})
        db.add(lead)
        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def get_by_id(db: AsyncSession, lead_id: int) -> Lead | None:
        result = await db.execute(select(Lead).where(Lead.id == lead_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def resolve_for_upsert(
        db: AsyncSession, phone: str, email: str | None = None
    ) -> Lead | None:
        """Выбрать запись для upsert без OR(phone, email): сначала телефон, иначе email.

        Избегает выбора «чужой» строки, когда только email совпал с другим лидом.
        """
        by_phone = await db.execute(select(Lead).where(Lead.phone == phone).limit(1))
        hit = by_phone.scalar_one_or_none()
        if hit:
            return hit
        em = (email or "").strip()
        if em:
            by_email = await db.execute(select(Lead).where(Lead.email == em).limit(1))
            return by_email.scalar_one_or_none()
        return None

    @staticmethod
    async def update(db: AsyncSession, lead: Lead, **kwargs) -> Lead:
        """Обновить поля существующей заявки (пустые строки игнорируются)."""
        for key, value in kwargs.items():
            if hasattr(Lead, key) and value not in (None, ""):
                setattr(lead, key, value)
        lead.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def upsert(
        db: AsyncSession, phone: str, email: str | None = None, **kwargs
    ) -> tuple[Lead, bool]:
        """Найти по phone/email и обновить; если не найден — создать.

        Returns:
            (lead, is_newly_created)
        """
        lead = await LeadCRUD.resolve_for_upsert(db, phone=phone, email=email)
        if lead:
            await LeadCRUD.update(db, lead, **kwargs)
            return lead, False
        lead = await LeadCRUD.create(db, phone=phone, email=email, **kwargs)
        return lead, True

    @staticmethod
    async def list_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> list[Lead]:
        result = await db.execute(
            select(Lead).order_by(Lead.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    def _filter_conditions(
        *,
        source: str | None,
        language: str | None,
        q: str | None,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> list:
        conds: list = []
        if source and (s := source.strip()):
            conds.append(Lead.source == s)
        if language and (lng := language.strip()):
            conds.append(Lead.language == lng)
        if q and (qt := q.strip()):
            term = f"%{qt}%"
            conds.append(
                or_(
                    Lead.phone.ilike(term),
                    Lead.email.ilike(term),
                    Lead.first_name.ilike(term),
                    Lead.last_name.ilike(term),
                    Lead.business_niche.ilike(term),
                )
            )
        if created_from is not None:
            conds.append(Lead.created_at >= created_from)
        if created_to is not None:
            conds.append(Lead.created_at <= created_to)
        return conds

    @staticmethod
    async def list_filtered(
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
        source: str | None = None,
        language: str | None = None,
        q: str | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
    ) -> tuple[list[Lead], int]:
        conds = LeadCRUD._filter_conditions(
            source=source,
            language=language,
            q=q,
            created_from=created_from,
            created_to=created_to,
        )
        count_stmt = select(func.count()).select_from(Lead)
        list_stmt = select(Lead).order_by(Lead.created_at.desc())
        if conds:
            where = and_(*conds)
            count_stmt = count_stmt.where(where)
            list_stmt = list_stmt.where(where)
        total = int((await db.execute(count_stmt)).scalar_one())
        result = await db.execute(list_stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), total

    @staticmethod
    async def set_admin_notes(db: AsyncSession, lead: Lead, admin_notes: str) -> Lead:
        """Сохранить внутренние заметки; пустая строка очищает поле."""
        stripped = admin_notes.strip()
        lead.admin_notes = stripped if stripped else None
        lead.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def delete_by_id(db: AsyncSession, lead_id: int) -> bool:
        from .behavior import BehaviorCRUD

        await BehaviorCRUD.delete_for_lead(db, lead_id)
        await db.flush()
        try:
            result = await db.execute(delete(Lead).where(Lead.id == lead_id).returning(Lead.id))
            deleted = result.first() is not None
            await db.commit()
            return deleted
        except Exception:
            await db.rollback()
            raise
