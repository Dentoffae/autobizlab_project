import logging

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_DEFAULT_WEAK_SECRET = "change-this-secret-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="/app/.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="development", validation_alias="APP_ENV")

    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    jwt_secret: str = _DEFAULT_WEAK_SECRET
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = Field(
        default=30,
        validation_alias=AliasChoices("JWT_ACCESS_EXPIRE_MINUTES"),
    )
    jwt_refresh_expire_days: int = Field(
        default=14,
        validation_alias=AliasChoices("JWT_REFRESH_EXPIRE_DAYS"),
    )
    jwt_cookie_name: str = Field(
        default="admin_access_token",
        validation_alias=AliasChoices("JWT_COOKIE_NAME"),
    )
    jwt_refresh_cookie_name: str = Field(
        default="admin_refresh_token",
        validation_alias=AliasChoices("JWT_REFRESH_COOKIE_NAME"),
    )
    metrics_token: str = Field(
        default="",
        validation_alias=AliasChoices("METRICS_TOKEN"),
        description="Если задано — GET /api/v1/metrics только с Authorization: Bearer <token>.",
    )

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    telegram_chat_id_2: str = ""

    clamav_host: str = Field(default="", validation_alias="CLAMAV_HOST")
    clamav_port: int = Field(default=3310, validation_alias="CLAMAV_PORT")

    totp_issuer: str = Field(default="AutoBizLab", validation_alias="TOTP_ISSUER")

    cookie_secure: bool = Field(
        default=False,
        validation_alias=AliasChoices("COOKIE_SECURE"),
    )

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        """Sync URL для Alembic (psycopg3 driver)."""
        u = self.database_url
        if "+asyncpg://" in u:
            return u.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
        return u

    @property
    def auth_access_cookie_max_age(self) -> int:
        return int(self.jwt_access_expire_minutes * 60)

    @property
    def auth_refresh_cookie_max_age(self) -> int:
        return int(self.jwt_refresh_expire_days * 86400)

    @model_validator(mode="after")
    def validate_production_auth(self):
        sec = self.jwt_secret.strip()
        if self.is_production:
            if len(sec) < 32:
                raise ValueError(
                    "JWT_SECRET must be at least 32 characters when APP_ENV=production "
                    "(e.g. openssl rand -base64 32)"
                )
            if sec == _DEFAULT_WEAK_SECRET:
                raise ValueError("JWT_SECRET must not use the default value when APP_ENV=production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true when APP_ENV=production (HTTPS)")
        else:
            if sec == _DEFAULT_WEAK_SECRET or len(sec) < 32:
                logger.warning(
                    "Weak JWT_SECRET in non-production mode; never use this in APP_ENV=production."
                )
        return self


settings = Settings()  # type: ignore[call-arg]
