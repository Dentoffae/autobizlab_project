"""Общий bootstrap-схемы: create_all(checkfirst); унаследованные ALTER через IF NOT EXISTS.

Revision ID: 20250511_a001
Revises:
Create Date: 2026-05-11
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20250511_a001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    from app.core.database import Base
    # Регистрация всех таблиц в metadata
    from app.models.admin import AdminSetting  # noqa: F401
    from app.models.auth_user import AdminUser  # noqa: F401
    from app.models.behavior import LeadBehavior  # noqa: F401
    from app.models.lead import Lead  # noqa: F401
    from app.models.portfolio import LandingExample, CaseStudy  # noqa: F401

    Base.metadata.create_all(bind=conn, checkfirst=True)

    op.execute(sa.text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_notes TEXT"))
    op.execute(
        sa.text(
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS "
            "privacy_consent BOOLEAN NOT NULL DEFAULT false"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS "
            "privacy_consent_at TIMESTAMPTZ"
        )
    )


def downgrade() -> None:
    pass
