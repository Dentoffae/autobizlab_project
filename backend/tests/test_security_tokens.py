from __future__ import annotations

from app.config import settings
from app.core.security import create_access_token, create_refresh_token
from jose import jwt


def test_access_token_has_typ_access():
    tok = create_access_token({"sub": "u1"})
    payload = jwt.decode(tok, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["typ"] == "access"
    assert payload["sub"] == "u1"


def test_refresh_token_has_typ_refresh():
    tok = create_refresh_token("u2")
    payload = jwt.decode(tok, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["typ"] == "refresh"
    assert payload["sub"] == "u2"
