"""
Публичные read-only данные для формы заявки (без раскрытия всех admin_settings).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.database import get_db
from ..models.admin import AdminCRUD

router = APIRouter(prefix="/api/v1/public", tags=["public"])

# То же множество, что собирается на фронте в Enquire.jsx (defaults + переопределения из БД)
ENQUIRE_PUBLIC_SETTING_KEYS = frozenset({
    "industries",
    "industries_en",
    "services",
    "services_en",
    "task_types",
    "task_types_en",
    "budget_slider",
})


class PublicFormOptionRow(BaseModel):
    """Формат совместим с прежним чтением /api/v1/admin/settings (key + JSON в value)."""

    key: str
    value: str


@router.get("/enquire-form-options", response_model=list[PublicFormOptionRow])
async def enquire_form_options(db=Depends(get_db)):
    """Только ключи формы заявки. Остальные настройки — только через JWT /api/v1/admin/settings."""
    rows = await AdminCRUD.get_all_by_keys(db, ENQUIRE_PUBLIC_SETTING_KEYS)
    return [
        PublicFormOptionRow(key=r.key, value=r.value)
        for r in rows
        if r.key in ENQUIRE_PUBLIC_SETTING_KEYS
    ]
