"""
JWT и bcrypt утилиты для аутентификации администраторов.

Токен передаётся через httpOnly cookie (основной путь SPA) или заголовок Authorization (опционально).
Access token короткоживущий; refresh token — в отдельной cookie (ротация на /auth/refresh).
"""
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict[str, Any]) -> str:
    to_encode: dict[str, Any] = {**data, "typ": "access"}
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_expire_minutes)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(username: str) -> str:
    to_encode: dict[str, Any] = {"sub": username, "typ": "refresh"}
    expire = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_expire_days)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_bearer_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Access JWT из Bearer или из httpOnly cookie (имя задаётся в settings.jwt_cookie_name)."""
    if credentials is not None and credentials.credentials.strip():
        return credentials.credentials.strip()
    c = request.cookies.get(settings.jwt_cookie_name)
    if c and c.strip():
        return c.strip()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не авторизован",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_admin(token: str = Depends(get_bearer_token)) -> str:
    payload = _decode_token(token)
    if payload.get("typ") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется access token",
        )
    username: str | None = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректные данные токена",
        )
    return username


def decode_refresh_cookie(request: Request) -> dict:
    raw = request.cookies.get(settings.jwt_refresh_cookie_name)
    if not raw or not raw.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Нет refresh-сессии",
        )
    payload = _decode_token(raw.strip())
    if payload.get("typ") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный refresh token",
        )
    return payload
