from __future__ import annotations

from typing import Any

from app.core.http_errors import detail_to_message, validation_errors_list


def test_detail_to_message_string():
    assert detail_to_message("x") == "x"


def test_detail_to_message_dict_roundtrip():
    d = {"a": 1}
    assert detail_to_message(d) == d


class _FakeValidationExc:
    def errors(self) -> list[dict[str, Any]]:
        return [{"loc": ("body", "name"), "msg": "field required", "type": "value_error.missing"}]


def test_validation_errors_list_shape():
    out = validation_errors_list(_FakeValidationExc())  # type: ignore[arg-type]
    assert len(out) == 1
    assert out[0]["loc"] == ["body", "name"]
    assert out[0]["msg"] == "field required"
    assert out[0]["type"] == "value_error.missing"
