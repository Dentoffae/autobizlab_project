"""
Роутер /api/v1/admin — настройки сервиса.

Эндпоинты:
  GET  /api/v1/admin/settings         — все настройки (читает фронтенд для форм)
  GET  /api/v1/admin/settings/{key}   — конкретная настройка
  POST /api/v1/admin/settings         — создать/обновить настройку
  DELETE /api/v1/admin/settings/{key} — удалить настройку
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.admin import AdminCRUD

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ─── Схемы ───────────────────────────────────────────────────────────────────

class SettingIn(BaseModel):
    key:         str
    value:       object          # любой JSON-сериализуемый объект
    description: str = ""


class SettingOut(BaseModel):
    model_config = {"from_attributes": True}
    id:          int
    key:         str
    value:       str             # JSON-строка (парсите на клиенте)
    description: str | None


# ─── Эндпоинты ───────────────────────────────────────────────────────────────

@router.get("/settings", response_model=list[SettingOut])
async def get_all_settings(
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """Все настройки — только с JWT (cookie или Bearer). Публичная форма: /api/v1/public/enquire-form-options."""
    return await AdminCRUD.get_all(db)


@router.get("/settings/{key}", response_model=SettingOut)
async def get_setting(
    key: str,
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    rec = await AdminCRUD.get_by_key(db, key)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return rec


@router.post("/settings", response_model=SettingOut, status_code=200)
async def upsert_setting(
    data: SettingIn,
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """Создать или обновить настройку. Требует JWT Bearer токен."""
    rec = await AdminCRUD.set(db, key=data.key, value=data.value, description=data.description)
    logger.info("admin setting upsert: key=%s by %s", data.key, _admin)
    return rec


@router.delete("/settings/{key}", status_code=204)
async def delete_setting(
    key: str,
    db=Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """Удалить настройку. Требует JWT Bearer токен."""
    deleted = await AdminCRUD.delete(db, key)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
