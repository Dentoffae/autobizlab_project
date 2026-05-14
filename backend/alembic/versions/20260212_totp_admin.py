"""Добавление totp_secret для 2FA администраторов.

Revision ID: 20260212_totp
Revises: 20250511_a001
Create Date: 2026-02-12
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260212_totp"
down_revision = "20250511_a001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64)"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE admin_users DROP COLUMN IF EXISTS totp_secret"))
