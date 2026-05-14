#!/bin/sh
set -e
cd /app
python -c "
from pathlib import Path
import alembic.command
import alembic.config
from app.config import settings
cfg = alembic.config.Config(str(Path('/app/alembic.ini')))
cfg.set_main_option('sqlalchemy.url', settings.database_url_sync)
alembic.command.upgrade(cfg, 'head')
"
export PROMETHEUS_MULTIPROC_DIR=/app/prometheus_multiproc
rm -rf "${PROMETHEUS_MULTIPROC_DIR}"
mkdir -p "${PROMETHEUS_MULTIPROC_DIR}"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
