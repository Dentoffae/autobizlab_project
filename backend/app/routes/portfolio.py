"""
Роутер /api/v1/portfolio — примеры лендингов и кейсы.

Публичные (без токена):
  GET  /api/v1/portfolio/landings        — все активные примеры лендингов
  GET  /api/v1/portfolio/cases           — все кейсы

Защищённые (JWT):
  POST   /api/v1/portfolio/landings
  PUT    /api/v1/portfolio/landings/{id}
  DELETE /api/v1/portfolio/landings/{id}
  POST   /api/v1/portfolio/cases
  PUT    /api/v1/portfolio/cases/{id}
  DELETE /api/v1/portfolio/cases/{id}
"""
import logging
import os
import uuid
from datetime import datetime

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..config import settings
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.portfolio import CaseCRUD, LandingCRUD
from ..services import upload_image_security as upload_sec

MEDIA_DIR = "/app/media"
ALLOWED_EXT = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_SIZE = 8 * 1024 * 1024  # 8 MB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


# ─── Схемы ────────────────────────────────────────────────────────────────────

class LandingIn(BaseModel):
    title:          str
    title_en:       str  = ""
    category:       str  = ""
    category_en:    str  = ""
    description:    str  = ""
    description_en: str  = ""
    image_url:      str  = ""
    link_url:       str  = ""
    sort_order:     int  = 0
    is_active:      bool = True


class LandingOut(BaseModel):
    model_config = {"from_attributes": True}
    id:             int
    title:          str
    title_en:       str | None
    category:       str | None
    category_en:    str | None
    description:    str | None
    description_en: str | None
    image_url:      str | None
    link_url:       str | None
    sort_order:     int
    is_active:      bool
    created_at:     datetime


class CaseIn(BaseModel):
    title:            str
    title_en:         str  = ""
    industry:         str  = ""
    industry_en:      str  = ""
    description:      str  = ""
    description_en:   str  = ""
    result_metric:    str  = ""
    result_label:     str  = ""
    result_label_en:  str  = ""
    extra_metrics:    str  = ""
    extra_metrics_en: str  = ""
    is_featured:      bool = False
    sort_order:       int  = 0


class CaseOut(BaseModel):
    model_config = {"from_attributes": True}
    id:               int
    title:            str
    title_en:         str | None
    industry:         str | None
    industry_en:      str | None
    description:      str | None
    description_en:   str | None
    result_metric:    str | None
    result_label:     str | None
    result_label_en:  str | None
    extra_metrics:    str | None
    extra_metrics_en: str | None
    is_featured:      bool
    sort_order:       int
    created_at:       datetime


# ─── Загрузка изображений ────────────────────────────────────────────────────

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    _: str = Depends(get_current_admin),
):
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "Файл слишком большой (максимум 8 МБ)")

    ext_declared = ((file.filename or "").rsplit(".", 1)[-1]).lower()
    if ext_declared not in ALLOWED_EXT:
        raise HTTPException(400, f"Разрешены только: {', '.join(sorted(ALLOWED_EXT))}")

    try:
        sniff_ext, _mime = upload_sec.sniff_and_verify_image(content)
    except ValueError as e:
        hint = str(e.args[0]) if e.args else ""
        msg = {
            "not_an_image": "Файл не является поддерживаемым изображением",
            "unsupported_image_type": "Тип изображения не поддерживается",
            "corrupt_or_unknown_image": "Повреждённое или недопустимое изображение",
            "invalid_image_payload": "Не удалось прочитать изображение",
            "virus_found": "Файл отклонён проверкой безопасности",
        }.get(hint, "Неверный формат файла")
        logger.info("upload rejected by content check: %s", hint)
        raise HTTPException(400, msg) from None

    risk = upload_sec.upload_risk_score(
        declared_ext=ext_declared,
        sniffed_ext=sniff_ext,
        filename=file.filename or "",
        size=len(content),
        max_size=MAX_SIZE,
    )
    if risk >= 2:
        logger.info("upload elevated risk score=%s name=%s", risk, file.filename)

    try:
        upload_sec.maybe_scan_clamav(
            content,
            risk,
            settings.clamav_host,
            settings.clamav_port,
        )
    except ValueError:
        raise HTTPException(400, "Файл отклонён проверкой безопасности") from None
    except RuntimeError:
        raise HTTPException(503, "Сервис антивирусной проверки недоступен") from None

    os.makedirs(MEDIA_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{sniff_ext}"
    filepath = os.path.join(MEDIA_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    logger.info("image uploaded: %s (risk=%s)", filename, risk)
    return {"url": f"/media/{filename}"}


# ─── Лендинги — публичные ─────────────────────────────────────────────────────

@router.get("/landings", response_model=list[LandingOut])
async def list_landings(db=Depends(get_db)):
    return await LandingCRUD.get_all(db, active_only=True)


# ─── Лендинги — защищённые ───────────────────────────────────────────────────

@router.get("/landings/all", response_model=list[LandingOut])
async def list_landings_admin(db=Depends(get_db), _=Depends(get_current_admin)):
    return await LandingCRUD.get_all(db, active_only=False)


@router.post("/landings", response_model=LandingOut, status_code=201)
async def create_landing(data: LandingIn, db=Depends(get_db), _=Depends(get_current_admin)):
    obj = await LandingCRUD.create(
        db,
        title=data.title,
        title_en=data.title_en.strip() or None,
        category=data.category or None,
        category_en=data.category_en.strip() or None,
        description=data.description or None,
        description_en=data.description_en.strip() or None,
        image_url=data.image_url or None,
        link_url=data.link_url or None,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    logger.info("landing created: id=%s", obj.id)
    return obj


@router.put("/landings/{item_id}", response_model=LandingOut)
async def update_landing(item_id: int, data: LandingIn, db=Depends(get_db), _=Depends(get_current_admin)):
    obj = await LandingCRUD.update(
        db, item_id,
        title=data.title,
        title_en=data.title_en.strip() or None,
        category=data.category or None,
        category_en=data.category_en.strip() or None,
        description=data.description or None,
        description_en=data.description_en.strip() or None,
        image_url=data.image_url or None,
        link_url=data.link_url or None,
        sort_order=data.sort_order,
        is_active=data.is_active,
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return obj


@router.delete("/landings/{item_id}", status_code=204)
async def delete_landing(item_id: int, db=Depends(get_db), _=Depends(get_current_admin)):
    if not await LandingCRUD.delete(db, item_id):
        raise HTTPException(status_code=404, detail="Not found")


# ─── Кейсы — публичные ───────────────────────────────────────────────────────

@router.get("/cases", response_model=list[CaseOut])
async def list_cases(db=Depends(get_db)):
    return await CaseCRUD.get_all(db)


# ─── Кейсы — защищённые ──────────────────────────────────────────────────────

@router.post("/cases", response_model=CaseOut, status_code=201)
async def create_case(data: CaseIn, db=Depends(get_db), _=Depends(get_current_admin)):
    obj = await CaseCRUD.create(
        db,
        title=data.title,
        title_en=data.title_en.strip() or None,
        industry=data.industry or None,
        industry_en=data.industry_en.strip() or None,
        description=data.description or None,
        description_en=data.description_en.strip() or None,
        result_metric=data.result_metric or None,
        result_label=data.result_label or None,
        result_label_en=data.result_label_en.strip() or None,
        extra_metrics=data.extra_metrics or None,
        extra_metrics_en=data.extra_metrics_en.strip() or None,
        is_featured=data.is_featured,
        sort_order=data.sort_order,
    )
    logger.info("case created: id=%s", obj.id)
    return obj


@router.put("/cases/{item_id}", response_model=CaseOut)
async def update_case(item_id: int, data: CaseIn, db=Depends(get_db), _=Depends(get_current_admin)):
    obj = await CaseCRUD.update(
        db, item_id,
        title=data.title,
        title_en=data.title_en.strip() or None,
        industry=data.industry or None,
        industry_en=data.industry_en.strip() or None,
        description=data.description or None,
        description_en=data.description_en.strip() or None,
        result_metric=data.result_metric or None,
        result_label=data.result_label or None,
        result_label_en=data.result_label_en.strip() or None,
        extra_metrics=data.extra_metrics or None,
        extra_metrics_en=data.extra_metrics_en.strip() or None,
        is_featured=data.is_featured,
        sort_order=data.sort_order,
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return obj


@router.delete("/cases/{item_id}", status_code=204)
async def delete_case(item_id: int, db=Depends(get_db), _=Depends(get_current_admin)):
    if not await CaseCRUD.delete(db, item_id):
        raise HTTPException(status_code=404, detail="Not found")
