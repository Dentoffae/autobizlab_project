"""
Роутер /api/v1/auth — аутентификация администраторов.

Эндпоинты:
  GET  /api/v1/auth/has-admins  — есть ли хоть один администратор в БД (публично)
  POST /api/v1/auth/register    — регистрация (только если adminов ещё нет)
  POST /api/v1/auth/login       — вход, access + refresh в httpOnly cookies
  POST /api/v1/auth/refresh     — новая пара access+refresh по refresh cookie
  POST /api/v1/auth/logout      — сброс cookie
  GET  /api/v1/auth/me          — данные текущего администратора (cookie или Bearer)
  GET  /api/v1/auth/totp/status — включена ли 2FA (JWT)
  POST /api/v1/auth/totp/begin  — выдать секрет + otpauth URI для приложения-аутентификатора (JWT)
  POST /api/v1/auth/totp/confirm — сохранить секрет после проверки TOTP-кода (JWT)
  POST /api/v1/auth/totp/disable — отключить 2FA (пароль + код)
"""
from __future__ import annotations

import logging
import re

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..config import settings
from ..core.database import get_db
from ..core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_cookie,
    get_current_admin,
    hash_password,
    verify_password,
)
from ..models.auth_user import AdminUserCRUD

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_PASSWORD_POLICY_RE = re.compile(
    r"^(?=.{12,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s\x00-\x08\x0b\x0c\x0e-\x1f]*$"
)


def _validate_password_strength(password: str) -> None:
    """Минимум 12 символов, без пробелов и управляющих символов; латинские буквы обоих регистров и цифра."""
    if not _PASSWORD_POLICY_RE.fullmatch(password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Пароль: 12–128 символов, латинские буквы нижнего и верхнего регистра и цифра, "
                "без пробелов"
            ),
        )


# ─── Схемы ───────────────────────────────────────────────────────────────────


class CredentialsIn(BaseModel):
    username: str
    password: str
    totp_code: str | None = None


class TotpConfirmIn(BaseModel):
    secret: str = Field(..., min_length=16, max_length=64)
    code: str = Field(..., min_length=6, max_length=8)


class TotpDisableIn(BaseModel):
    password: str = Field(..., min_length=1)
    totp_code: str = Field(..., min_length=6, max_length=8)


def _normalize_totp_code(code: str | None) -> str:
    return (code or "").replace(" ", "").strip()


def _set_auth_cookie(response: JSONResponse, token: str) -> JSONResponse:
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        max_age=settings.auth_access_cookie_max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


def _set_refresh_cookie(response: JSONResponse, token: str) -> JSONResponse:
    response.set_cookie(
        key=settings.jwt_refresh_cookie_name,
        value=token,
        max_age=settings.auth_refresh_cookie_max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return response


def _clear_auth_cookie(response: JSONResponse) -> JSONResponse:
    response.delete_cookie(
        key=settings.jwt_cookie_name,
        path="/",
    )
    response.delete_cookie(
        key=settings.jwt_refresh_cookie_name,
        path="/",
    )
    return response


# ─── Эндпоинты ───────────────────────────────────────────────────────────────


@router.get("/has-admins")
async def has_admins(db=Depends(get_db)):
    """Возвращает, зарегистрирован ли хоть один администратор.
    Фронтенд использует это для отображения кнопки «Зарегистрироваться».
    """
    count = await AdminUserCRUD.count(db)
    return {"has_admins": count > 0}


@router.post("/register", status_code=201)
async def register(data: CredentialsIn, db=Depends(get_db)):
    """Регистрация первого администратора.
    Доступно только до тех пор, пока в таблице нет ни одного пользователя.
    JWT выставляется в httpOnly cookie (тело ответа не содержит токен).
    """
    count = await AdminUserCRUD.count(db)
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Регистрация закрыта: администратор уже существует",
        )
    if len(data.username.strip()) < 3:
        raise HTTPException(status_code=422, detail="Логин должен быть не менее 3 символов")
    _validate_password_strength(data.password)

    existing = await AdminUserCRUD.get_by_username(db, data.username.strip())
    if existing:
        raise HTTPException(status_code=409, detail="Логин уже занят")

    hashed = hash_password(data.password)
    user = await AdminUserCRUD.create(db, data.username.strip(), hashed)
    access = create_access_token({"sub": user.username})
    refresh = create_refresh_token(user.username)
    logger.info("Новый администратор зарегистрирован: %s", user.username)
    resp = JSONResponse(content={"ok": True, "username": user.username})
    _set_auth_cookie(resp, access)
    _set_refresh_cookie(resp, refresh)
    return resp


@router.post("/login")
async def login(data: CredentialsIn, db=Depends(get_db)):
    """Вход по логину и паролю. JWT только в httpOnly cookie."""
    user = await AdminUserCRUD.get_by_username(db, data.username.strip())
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    if user.totp_secret:
        code = _normalize_totp_code(data.totp_code)
        if not code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Требуется код 2FA", "otp_required": True},
            )
        if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный код 2FA",
            )

    access = create_access_token({"sub": user.username})
    refresh = create_refresh_token(user.username)
    resp = JSONResponse(content={"ok": True, "username": user.username})
    _set_auth_cookie(resp, access)
    _set_refresh_cookie(resp, refresh)
    return resp


@router.post("/refresh")
async def refresh_session(request: Request, db=Depends(get_db)):
    """Новая пара access+refresh по действительной refresh cookie (ротация refresh)."""
    payload = decode_refresh_cookie(request)
    username = payload.get("sub")
    if not username or not isinstance(username, str):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный токен")
    user = await AdminUserCRUD.get_by_username(db, username.strip())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    access = create_access_token({"sub": user.username})
    refresh = create_refresh_token(user.username)
    resp = JSONResponse(content={"ok": True})
    _set_auth_cookie(resp, access)
    _set_refresh_cookie(resp, refresh)
    return resp


@router.post("/logout")
async def logout():
    """Сброс cookie сессии админки."""
    resp = JSONResponse(content={"ok": True})
    return _clear_auth_cookie(resp)


@router.get("/me")
async def me(username: str = Depends(get_current_admin)):
    """Проверка токена и получение имени текущего администратора."""
    return {"username": username}


@router.get("/totp/status")
async def totp_status(db=Depends(get_db), username: str = Depends(get_current_admin)):
    user = await AdminUserCRUD.get_by_username(db, username.strip())
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"enabled": bool(user.totp_secret)}


@router.post("/totp/begin")
async def totp_begin(db=Depends(get_db), username: str = Depends(get_current_admin)):
    user = await AdminUserCRUD.get_by_username(db, username.strip())
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.totp_secret:
        raise HTTPException(
            status_code=409,
            detail="2FA уже включена. Отключите её перед новой привязкой.",
        )
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    issuer = settings.totp_issuer.strip() or "AutoBizLab"
    otpauth_url = totp.provisioning_uri(name=user.username, issuer_name=issuer)
    return {"secret": secret, "otpauth_url": otpauth_url, "issuer": issuer}


@router.post("/totp/confirm", status_code=204)
async def totp_confirm(
    data: TotpConfirmIn,
    db=Depends(get_db),
    username: str = Depends(get_current_admin),
):
    user = await AdminUserCRUD.get_by_username(db, username.strip())
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.totp_secret:
        raise HTTPException(status_code=409, detail="2FA уже включена")
    code = _normalize_totp_code(data.code)
    if not pyotp.TOTP(data.secret.strip()).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")
    await AdminUserCRUD.set_totp_secret(db, user, data.secret.strip())
    logger.info("2FA включена: %s", user.username)


@router.post("/totp/disable", status_code=204)
async def totp_disable(
    data: TotpDisableIn,
    db=Depends(get_db),
    username: str = Depends(get_current_admin),
):
    user = await AdminUserCRUD.get_by_username(db, username.strip())
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA не была включена")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Неверный пароль")
    code = _normalize_totp_code(data.totp_code)
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Неверный код 2FA")
    await AdminUserCRUD.set_totp_secret(db, user, None)
    logger.info("2FA отключена: %s", user.username)