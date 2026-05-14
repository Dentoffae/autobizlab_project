"""
AdminSetting — конфигурация сервиса (услуги, диапазоны бюджета, и т.д.).
Фронтенд читает эти данные для динамического формирования интерфейса.

SQL (генерируется через Base.metadata.create_all):
    CREATE TABLE admin_settings (
        id          SERIAL PRIMARY KEY,
        key         VARCHAR(100) UNIQUE NOT NULL,  -- идентификатор настройки
        value       TEXT         NOT NULL,          -- JSON-строка со значением
        description TEXT,
        created_at  TIMESTAMPTZ  DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );
"""
import json
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from ..core.database import Base

# ── Дефолтные настройки (фронтенд читает их для формирования форм) ─────────
DEFAULTS: dict[str, object] = {
    "budget_slider": {
        "min": 1000,
        "max": 20000,
        "step": 1000,
        "currency": "AED",
    },
    "services": [
        "AI-чат-бот",
        "AI-ассистент для клиентского сервиса",
        "Автоматизация бизнес-процессов",
        "Комплексное AI-внедрение",
    ],
    "services_en": [
        "AI chatbot",
        "AI assistant for customer service",
        "Business process automation",
        "Full AI implementation",
    ],
    "budget_ranges": [
        "до $1 000",
        "$1 000 – $5 000",
        "$5 000 – $15 000",
        "Обсудим индивидуально",
    ],
    "budget_ranges_en": [
        "Under $1,000",
        "$1,000 – $5,000",
        "$5,000 – $15,000",
        "Let's discuss individually",
    ],
    "industries": [
        "Недвижимость",
        "E-commerce / Ритейл",
        "Образование",
        "Медицина и здоровье",
        "FinTech",
        "B2B Услуги",
        "Гостиничный бизнес / HoReCa",
        "Логистика",
        "Другое",
    ],
    "industries_en": [
        "Real Estate",
        "E-commerce / Retail",
        "Education",
        "Healthcare",
        "FinTech",
        "B2B Services",
        "Hospitality / HoReCa",
        "Logistics",
        "Other",
    ],
    "company_sizes": [
        "1–10 человек",
        "11–50 человек",
        "51–200 человек",
        "200+ человек",
    ],
    "company_sizes_en": [
        "1–10 people",
        "11–50 people",
        "51–200 people",
        "200+ people",
    ],
    "task_volumes": [
        "Небольшой (1–2 процесса)",
        "Средний (3–10 процессов)",
        "Масштабный (10+ процессов)",
    ],
    "task_volumes_en": [
        "Small (1–2 processes)",
        "Medium (3–10 processes)",
        "Large (10+ processes)",
    ],
    "timelines": [
        "Срочно (до 2 недель)",
        "В течение месяца",
        "1–3 месяца",
        "Пока изучаем варианты",
    ],
    "timelines_en": [
        "Urgent (within 2 weeks)",
        "Within a month",
        "1–3 months",
        "Still exploring options",
    ],
    "roles": [
        "Владелец / CEO",
        "Руководитель отдела",
        "Менеджер / Специалист",
        "Другое",
    ],
    "roles_en": [
        "Owner / CEO",
        "Department head",
        "Manager / Specialist",
        "Other",
    ],
    "contact_methods": [
        "WhatsApp",
        "Telegram",
        "Email",
        "Телефонный звонок",
        "Любой удобный",
    ],
    "contact_methods_en": [
        "WhatsApp",
        "Telegram",
        "Email",
        "Phone call",
        "Whatever works best",
    ],
    "task_types": [
        "Обработка входящих заявок",
        "Квалификация лидов",
        "Поддержка клиентов 24/7",
        "Внутренняя автоматизация",
        "Интеграция систем",
        "Аналитика и отчёты",
    ],
    "task_types_en": [
        "Inbound lead handling",
        "Lead qualification",
        "24/7 customer support",
        "Internal automation",
        "Systems integration",
        "Analytics & reporting",
    ],
}

DESCRIPTIONS: dict[str, str] = {
    "budget_slider":   "Параметры ползунка бюджета: min, max, step, currency",
    "services":        "Список услуг (отображается в форме /enquire)",
    "services_en":     "Services list — English /en/enquire",
    "budget_ranges":   "Варианты бюджета для выбора клиентом",
    "budget_ranges_en": "Budget options — English",
    "industries":      "Отрасли бизнеса",
    "industries_en":   "Industries — English /en/enquire",
    "company_sizes":   "Размеры компании",
    "company_sizes_en": "Company sizes — English",
    "task_volumes":    "Объём задачи",
    "task_volumes_en": "Task volume — English",
    "timelines":       "Сроки внедрения",
    "timelines_en":    "Timelines — English",
    "roles":           "Роли / должности клиента",
    "roles_en":        "Client roles — English",
    "contact_methods": "Предпочтительные способы связи",
    "contact_methods_en": "Contact methods — English",
    "task_types":       "Типы задачи (форма /enquire)",
    "task_types_en":    "Task types — English /en/enquire",
}


class AdminSetting(Base):
    __tablename__ = "admin_settings"

    id:          Mapped[int]       = mapped_column(Integer, primary_key=True, index=True)
    key:         Mapped[str]       = mapped_column(String(100), unique=True, nullable=False, index=True)
    value:       Mapped[str]       = mapped_column(Text, nullable=False)   # JSON-строка
    description: Mapped[str | None] = mapped_column(Text)

    created_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:  Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────
# CRUD-операции
# ─────────────────────────────────────────────
from collections.abc import Collection

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession


class AdminCRUD:
    """Набор статических методов для управления настройками AdminSetting."""

    @staticmethod
    async def get_all(db: AsyncSession) -> list[AdminSetting]:
        result = await db.execute(select(AdminSetting).order_by(AdminSetting.key))
        return list(result.scalars().all())

    @staticmethod
    async def get_all_by_keys(
        db: AsyncSession,
        keys: Collection[str],
    ) -> list[AdminSetting]:
        """Загружает только записи по списку ключей (полезно для публичных read-only эндпоинтов)."""
        key_list = tuple({k.strip() for k in keys if (k or "").strip()})
        if not key_list:
            return []
        result = await db.execute(
            select(AdminSetting)
            .where(AdminSetting.key.in_(key_list))
            .order_by(AdminSetting.key)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_key(db: AsyncSession, key: str) -> AdminSetting | None:
        result = await db.execute(
            select(AdminSetting).where(AdminSetting.key == key)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def set(
        db: AsyncSession, key: str, value: object, description: str = ""
    ) -> AdminSetting:
        """Создать или обновить настройку по ключу (upsert)."""
        value_str = json.dumps(value, ensure_ascii=False)
        stmt = (
            pg_insert(AdminSetting)
            .values(key=key, value=value_str, description=description or None)
            .on_conflict_do_update(
                index_elements=["key"],
                set_=dict(
                    value=value_str,
                    description=description or AdminSetting.description,
                    updated_at=datetime.now(UTC),
                ),
            )
            .returning(AdminSetting)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.scalar_one()

    @staticmethod
    async def delete(db: AsyncSession, key: str) -> bool:
        rec = await AdminCRUD.get_by_key(db, key)
        if not rec:
            return False
        await db.delete(rec)
        await db.commit()
        return True

    @staticmethod
    async def seed_defaults(db: AsyncSession) -> None:
        """Записать дефолтные настройки, если они ещё не существуют.

        Для ключей ``*_en`` с пустым списком в БД — повторно подставляем шаблон
        (например после ручной очистки или старой версии без английских строк).
        """
        for key, value in DEFAULTS.items():
            desc = DESCRIPTIONS.get(key, "")
            existing = await AdminCRUD.get_by_key(db, key)
            if existing is None:
                await AdminCRUD.set(db, key, value, desc)
                continue
            if not key.endswith("_en") or not isinstance(value, list):
                continue
            try:
                parsed: object = json.loads(existing.value)
            except json.JSONDecodeError:
                await AdminCRUD.set(db, key, value, desc)
                continue
            if isinstance(parsed, list) and len(parsed) == 0:
                await AdminCRUD.set(db, key, value, desc)
