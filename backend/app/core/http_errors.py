"""Единый формат ошибок API и сериализация detail для JSON."""
from __future__ import annotations

from typing import Any

from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel


def detail_to_message(detail: Any) -> str | dict | list:
    """Привести FastAPI detail к JSON-совместимому виду для поля message."""
    if isinstance(detail, str):
        return detail
    if isinstance(detail, dict):
        return detail
    if isinstance(detail, list):
        return detail
    return str(detail)


def validation_errors_list(exc: RequestValidationError) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for err in exc.errors():
        out.append(
            {
                "loc": list(err.get("loc", ())),
                "msg": err.get("msg", ""),
                "type": err.get("type", ""),
            }
        )
    return out


class ErrorBody(BaseModel):
    code: str
    message: str | dict | list


class ErrorEnvelope(BaseModel):
    error: ErrorBody
    correlation_id: str | None = None
