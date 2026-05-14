from __future__ import annotations

"""
Роутер /api/v1/leads — управление заявками.

Эндпоинты:
  POST /api/v1/leads/quick    — быстрая форма с главной страницы (имя + телефон)
  POST /api/v1/leads/enquire  — полная форма /enquire (upsert по phone/email)
  GET  /api/v1/leads/         — список заявок с пагинацией и фильтрами (админ)
  GET  /api/v1/leads/{id}     — получить заявку по ID
"""
import json
import logging
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError

from ..core.database import get_db
from ..core.security import get_current_admin, verify_password
from ..core.telegram import notify_enquire_lead, notify_quick_lead
from ..models.auth_user import AdminUserCRUD
from ..models.behavior import BehaviorCRUD
from ..models.lead import LeadCRUD

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/leads", tags=["leads"])

# ── Лимиты поведенческой аналитики (защита от раздувания JSON-тела запроса) ──
_BEH_LIST_MAX_ITEMS = 48
_BEH_LABEL_MAX_LEN = 256
_BEH_CLICK_MAP_MAX_DEPTH = 5
_BEH_CLICK_MAP_MAX_KEYS = 48
_BEH_CLICK_MAP_KEY_MAX_LEN = 128
_BEH_SCALAR_STR_MAX = 512
_BEH_JSON_SOFT_CAP_BYTES = 20_480


def _walk_click_map(value: Any, depth: int) -> None:
    if depth > _BEH_CLICK_MAP_MAX_DEPTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="click_map: слишком глубокая вложенность",
        )
    if isinstance(value, dict):
        if len(value) > _BEH_CLICK_MAP_MAX_KEYS:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="click_map: слишком много ключей на одном уровне",
            )
        for k, v in value.items():
            if not isinstance(k, str) or len(k) > _BEH_CLICK_MAP_KEY_MAX_LEN:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="click_map: недопустимый или слишком длинный ключ",
                )
            _walk_click_map(v, depth + 1)
    elif isinstance(value, list):
        if len(value) > _BEH_LIST_MAX_ITEMS:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="click_map: слишком длинный массив",
            )
        for item in value:
            _walk_click_map(item, depth + 1)
    elif isinstance(value, str):
        if len(value) > _BEH_SCALAR_STR_MAX:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="click_map: слишком длинная строка",
            )
    elif value is None or isinstance(value, bool | int | float):
        return
    else:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="click_map: поддерживаются только строки, числа, bool, массивы и объекты",
        )


def _enforce_behavior_analytics_payload(data: EnquireLeadIn) -> None:
    if len(data.buttons_clicked) > _BEH_LIST_MAX_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="слишком много элементов в buttons_clicked",
        )
    if len(data.cursor_hovers) > _BEH_LIST_MAX_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="слишком много элементов в cursor_hovers",
        )
    for i, s in enumerate(data.buttons_clicked):
        if not isinstance(s, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"buttons_clicked[{i}] должен быть строкой",
            )
        if len(s) > _BEH_LABEL_MAX_LEN:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"переполнена строка в buttons_clicked (>{_BEH_LABEL_MAX_LEN} символов)",
            )
    for i, s in enumerate(data.cursor_hovers):
        if not isinstance(s, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"cursor_hovers[{i}] должен быть строкой",
            )
        if len(s) > _BEH_LABEL_MAX_LEN:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"переполнена строка в cursor_hovers (>{_BEH_LABEL_MAX_LEN} символов)",
            )

    cm = data.click_map
    if cm is None:
        cm = {}
    elif not isinstance(cm, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="click_map должен быть JSON-объектом",
        )
    else:
        _walk_click_map(cm, 0)

    blob = json.dumps(
        {"buttons_clicked": data.buttons_clicked, "cursor_hovers": data.cursor_hovers, "click_map": cm},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    encoded = blob.encode("utf-8")
    if len(encoded) > _BEH_JSON_SOFT_CAP_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "аналитическое поведение (buttons_clicked/cursor_hovers/click_map) "
                "превышает допустимый размер после сериализации"
            ),
        )


# ─── Схемы запросов ──────────────────────────────────────────────────────────

class QuickLeadIn(BaseModel):
    """Быстрая форма: имя + телефон (главная страница). Имя может быть пустым — подставляем заглушку."""
    name:              str = ""
    phone:             str = Field(..., min_length=5)
    language:          str = "ru"
    referrer:          str = ""
    utm_source:        str = ""
    utm_medium:        str = ""
    utm_campaign:      str = ""
    screen_resolution: str = ""
    timezone:          str = ""
    page_time_seconds: int = 0
    user_agent:        str = ""
    privacy_consent:  bool = False


class EnquireLeadIn(BaseModel):
    """Полная форма /enquire — контакты, бизнес, задача + поведение."""

    model_config = {"extra": "forbid"}
    # Контактные данные
    first_name:         str = ""
    last_name:          str = ""
    middle_name:        str = ""
    phone:              str = Field(..., min_length=5)
    email:              str = ""

    # Бизнес
    business_niche:     str = ""
    company_size:       str = ""
    task_volume:        str = ""
    role:               str = ""
    business_info:      str = ""

    # Задача
    budget:             str = ""
    timeline:           str = ""
    task_type:          str = ""
    interested_product: str = ""

    # Коммуникация
    contact_preference: str = ""
    preferred_time:     str = ""
    comments:           str = ""

    # Мета
    language:           str = "ru"
    referrer:           str = ""
    utm_source:         str = ""
    utm_medium:         str = ""
    utm_campaign:       str = ""
    screen_resolution:  str = ""
    timezone:           str = ""
    page_time_seconds:  int = 0
    user_agent:         str = ""

    # Поведенческая аналитика (опционально)
    time_on_page:       int = 0
    form_fill_time:     int = 0
    scroll_depth:       int = 0
    return_count:       int = 0
    buttons_clicked:    list[str] = Field(default_factory=list)
    cursor_hovers:      list[str] = Field(default_factory=list)
    click_map:          dict[str, Any] = Field(default_factory=dict)

    privacy_consent: bool = False


class AdminNotesPatch(BaseModel):
    """Внутренний комментарий администратора к заявке."""
    admin_notes: str = ""


class DeleteLeadConfirm(BaseModel):
    password: str = Field(..., min_length=1)


class LeadOut(BaseModel):
    model_config = {"from_attributes": True}
    id:                 int
    # Контакты
    first_name:         str | None
    last_name:          str | None
    middle_name:        str | None
    phone:              str
    email:              str | None
    # Бизнес
    business_niche:     str | None
    company_size:       str | None
    task_volume:        str | None
    role:               str | None
    business_info:      str | None
    # Задача
    budget:             str | None
    timeline:           str | None
    task_type:          str | None
    interested_product: str | None
    # Коммуникация
    contact_preference: str | None
    preferred_time:     str | None
    comments:           str | None
    admin_notes:        str | None
    privacy_consent:     bool
    privacy_consent_at: datetime | None
    # Служебные
    source:             str | None
    utm_source:         str | None
    utm_medium:         str | None
    utm_campaign:       str | None
    created_at:         datetime
    updated_at:         datetime


class LeadListOut(BaseModel):
    """Пагинированный список заявок (админка)."""

    items: list[LeadOut]
    total: int
    skip: int
    limit: int


# ─── Эндпоинты ───────────────────────────────────────────────────────────────

def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _require_privacy_consent(flag: bool) -> None:
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Требуется согласие на обработку персональных данных",
        )


@router.post("/quick", status_code=201)
async def quick_lead(data: QuickLeadIn, request: Request, db=Depends(get_db)):
    """Сохранить заявку из быстрой формы (имя + телефон).
    Если лид с таким телефоном уже есть — обновляет мета-данные.
    """
    _require_privacy_consent(data.privacy_consent)
    consent_at = datetime.now(UTC)
    # Разбиваем «имя» из одного поля на части (пустое имя допустимо)
    raw_name = (data.name or "").strip() or "Клиент"
    parts = raw_name.split()
    first_name  = parts[0] if len(parts) > 0 else raw_name
    last_name   = parts[1] if len(parts) > 1 else ""
    middle_name = parts[2] if len(parts) > 2 else ""

    lead, created = await LeadCRUD.upsert(
        db,
        phone=data.phone,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        source="quick",
        language=data.language or None,
        referrer=data.referrer or None,
        utm_source=data.utm_source or None,
        utm_medium=data.utm_medium or None,
        utm_campaign=data.utm_campaign or None,
        ip_address=_client_ip(request),
        user_agent=data.user_agent or request.headers.get("User-Agent", "") or None,
        privacy_consent=True,
        privacy_consent_at=consent_at,
    )
    logger.info("quick_lead: id=%s phone=%s created=%s", lead.id, lead.phone, created)
    await notify_quick_lead(lead, data.page_time_seconds)
    return {"id": lead.id, "created": created}


@router.post("/enquire", status_code=200)
async def enquire_lead(data: EnquireLeadIn, request: Request, db=Depends(get_db)):
    """Upsert полной заявки: ищет по phone/email, обновляет или создаёт.
    Одновременно сохраняет поведенческую аналитику.
    """
    _enforce_behavior_analytics_payload(data)
    _require_privacy_consent(data.privacy_consent)
    consent_at = datetime.now(UTC)
    lead, created = await LeadCRUD.upsert(
        db,
        phone=data.phone,
        email=data.email or None,
        first_name=data.first_name or None,
        last_name=data.last_name or None,
        middle_name=data.middle_name or None,
        business_niche=data.business_niche or None,
        company_size=data.company_size or None,
        task_volume=data.task_volume or None,
        role=data.role or None,
        business_info=data.business_info or None,
        budget=data.budget or None,
        timeline=data.timeline or None,
        task_type=data.task_type or None,
        interested_product=data.interested_product or None,
        contact_preference=data.contact_preference or None,
        preferred_time=data.preferred_time or None,
        comments=data.comments or None,
        source="enquire",
        language=data.language or None,
        referrer=data.referrer or None,
        utm_source=data.utm_source or None,
        utm_medium=data.utm_medium or None,
        utm_campaign=data.utm_campaign or None,
        ip_address=_client_ip(request),
        user_agent=data.user_agent or request.headers.get("User-Agent", "") or None,
        privacy_consent=True,
        privacy_consent_at=consent_at,
    )

    # Сохранить поведенческую аналитику
    await BehaviorCRUD.upsert(
        db,
        lead_id=lead.id,
        time_on_page=data.time_on_page or None,
        form_fill_time=data.form_fill_time or None,
        scroll_depth=data.scroll_depth or None,
        return_count=data.return_count or None,
        buttons_clicked=json.dumps(data.buttons_clicked, ensure_ascii=False) if data.buttons_clicked else None,
        cursor_hovers=json.dumps(data.cursor_hovers, ensure_ascii=False) if data.cursor_hovers else None,
        click_map=json.dumps(data.click_map, ensure_ascii=False) if data.click_map else None,
        screen_resolution=data.screen_resolution or None,
        timezone=data.timezone or None,
    )

    logger.info("enquire_lead: id=%s phone=%s created=%s", lead.id, lead.phone, created)
    await notify_enquire_lead(lead)
    return {"id": lead.id, "created": created}


@router.get("/", response_model=LeadListOut)
async def list_leads(
    skip: Annotated[int, Field(0, ge=0)] = 0,
    limit: Annotated[int, Field(50, ge=1, le=200)] = 50,
    source: Literal["quick", "enquire"] | None = None,
    language: Annotated[str | None, Field(None, max_length=12)] = None,
    q: Annotated[str | None, Field(None, max_length=120)] = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """Список заявок с пагинацией и фильтрами. Требует JWT-токен администратора."""
    items, total = await LeadCRUD.list_filtered(
        db,
        skip=skip,
        limit=limit,
        source=source,
        language=language,
        q=q,
        created_from=created_from,
        created_to=created_to,
    )
    return LeadListOut(
        items=[LeadOut.model_validate(row) for row in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.patch("/{lead_id}/admin-notes", response_model=LeadOut)
async def patch_admin_notes(
    lead_id: int,
    data: AdminNotesPatch,
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """Сохранить / изменить внутренний комментарий администратора."""
    lead = await LeadCRUD.get_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await LeadCRUD.set_admin_notes(db, lead, data.admin_notes)
    return lead


@router.post("/{lead_id}/delete")
async def delete_lead_with_password(
    lead_id: int,
    data: DeleteLeadConfirm,
    db=Depends(get_db),
    username: str = Depends(get_current_admin),
):
    """Удалить заявку после подтверждения паролем текущего администратора."""
    existing = await LeadCRUD.get_by_id(db, lead_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    user = await AdminUserCRUD.get_by_username(db, username.strip())
    if not user or not verify_password(data.password, user.password_hash):
        # 403 — сессия уже есть, неверный пароль подтверждения (401 оставляем для «нет/просрочен токен»)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный пароль",
        )
    try:
        ok = await LeadCRUD.delete_by_id(db, lead_id)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Не удалось удалить заявку из-за связей в базе данных. "
                "Обновите страницу и попробуйте снова."
            ),
        ) from None
    if not ok:
        raise HTTPException(status_code=404, detail="Lead not found")
    logger.info("lead deleted id=%s by admin=%s", lead_id, username)
    return {"ok": True}


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: int,
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """Получить заявку по ID. Требует JWT-токен администратора."""
    lead = await LeadCRUD.get_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
