"""
AutoBizLab FastAPI Application — точка входа.

Структура:
  app/core/database.py   — async PostgreSQL driver
  app/models/           — ORM-модели + CRUD (Lead, LeadBehavior, AdminSetting)
  app/routes/           — FastAPI-роутеры (leads, admin, portfolio, auth, public)

Все сервисы доступны только внутри Docker-сети (autobizlab_net).
Наружу проксируется только префикс `/api/` через Nginx (маршруты API: `/api/v1/...`, совместимый алиас `/api/health`).

Миграции Alembic: docker-entrypoint.sh до fork воркеров uvicorn.
Prometheus multiprocess: каталог PROMETHEUS_MULTIPROC_DIR (см. docker-entrypoint.sh).
"""
from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    generate_latest,
    multiprocess,
)
from sqlalchemy import text

from .config import settings
from .core.database import AsyncSessionLocal
from .core.http_errors import (
    detail_to_message,
    validation_errors_list,
)

# Импорт моделей регистрирует их в Base.metadata
from .models import (  # noqa: F401
    AdminSetting,
    AdminUser,
    CaseStudy,
    LandingExample,
    Lead,
    LeadBehavior,
)
from .models.admin import AdminCRUD
from .routes import admin, auth, leads, portfolio, public_options

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

HTTP_REQUESTS_TOTAL = Counter(
    "autobizlab_http_requests_total",
    "Total HTTP requests",
    ["method", "path_template"],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup: seeding default admin settings…")
    async with AsyncSessionLocal() as db:
        await AdminCRUD.seed_defaults(db)

    logger.info("Startup complete.")
    yield
    logger.info("Shutdown.")


app = FastAPI(
    title="AutoBizLab API",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = cid
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = cid
    return response


# CORS — разрешаем только наш домен (Nginx добавляет нужные заголовки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://autobizlab.store",
        "https://www.autobizlab.store",
        "http://autobizlab.store",
        "http://www.autobizlab.store",
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Correlation-ID"],
    expose_headers=["X-Correlation-ID"],
)


@app.middleware("http")
async def prometheus_request_labels(request: Request, call_next):
    response = await call_next(request)
    route = request.scope.get("route")
    path_tpl = getattr(route, "path", None) or request.url.path
    HTTP_REQUESTS_TOTAL.labels(request.method, path_tpl).inc()
    return response


def _envelope_error(
    *,
    status_code: int,
    code: str,
    message,
    correlation_id: str | None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {"code": code, "message": message},
            "correlation_id": correlation_id,
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    cid = getattr(request.state, "correlation_id", None)
    msg = detail_to_message(exc.detail)
    code = f"http_{exc.status_code}"
    if isinstance(exc.detail, dict) and exc.detail.get("otp_required"):
        code = "otp_required"
    return _envelope_error(
        status_code=exc.status_code,
        code=code,
        message=msg,
        correlation_id=cid,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    cid = getattr(request.state, "correlation_id", None)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "validation_error",
                "message": validation_errors_list(exc),
            },
            "correlation_id": cid,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    cid = getattr(request.state, "correlation_id", None)
    message = "internal_error" if settings.is_production else str(exc)
    return _envelope_error(
        status_code=500,
        code="internal_error",
        message=message,
        correlation_id=cid,
    )


def _verify_metrics_access(request: Request) -> None:
    """Production: METRICS_TOKEN обязателен. Dev: если токен задан — проверяем Bearer."""
    tok = settings.metrics_token.strip()
    if settings.is_production:
        if not tok:
            raise HTTPException(status_code=404, detail="not_found")
    elif not tok:
        return
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {tok}":
        raise HTTPException(status_code=403, detail="metrics_forbidden")


# ── Роутеры ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(public_options.router)
app.include_router(leads.router)
app.include_router(admin.router)
app.include_router(portfolio.router)


async def health_check():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check: database ping failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database_unavailable",
        ) from None
    return {
        "status": "ok",
        "database": "ok",
        "version": app.version,
    }


app.add_api_route(
    "/api/v1/health",
    health_check,
    methods=["GET"],
    tags=["system"],
)
app.add_api_route(
    "/api/health",
    health_check,
    methods=["GET"],
    tags=["system"],
)


@app.get("/api/v1/metrics", include_in_schema=False)
async def prometheus_metrics(request: Request):
    """Prometheus: агрегация multiprocess + опциональная защита Bearer."""
    _verify_metrics_access(request)
    registry = CollectorRegistry()
    multiprocess.MultiProcessCollector(registry)
    payload = generate_latest(registry)
    return Response(content=payload, media_type=CONTENT_TYPE_LATEST)
