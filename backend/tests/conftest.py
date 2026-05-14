"""Минимальные переменные окружения до импорта `app` (Settings обязателен при загрузке)."""
from __future__ import annotations

import os

_REQUIRED = {
    "POSTGRES_USER": "pytest",
    "POSTGRES_PASSWORD": "pytest",
    "POSTGRES_DB": "pytest",
    "POSTGRES_HOST": "127.0.0.1",
}
for _k, _v in _REQUIRED.items():
    os.environ.setdefault(_k, _v)
