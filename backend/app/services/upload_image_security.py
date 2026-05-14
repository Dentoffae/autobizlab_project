"""
Проверка загружаемых изображений: магические байты и полный PIL-load,
риск-счётчик (несовпадение расширения, подозрительное имя и т.д.),
опциональный ClamAV INSTREAM при повышенном риске.
"""
from __future__ import annotations

import io
import logging
import socket
import struct

from PIL import Image

logger = logging.getLogger(__name__)

# Минимальный risk, при котором подключаемся к ClamAV (если задан host)
CLAM_SCAN_MIN_RISK = 2


def sniff_and_verify_image(content: bytes) -> tuple[str, str]:
    """
    Вернёт нормализованное расширение без точки ('jpeg','png','gif','webp') и MIME из PIL.
    ValueError(reason) где reason ключ для текстов в роутере.
    """
    if not content or len(content) < 24:
        raise ValueError("invalid_image_payload")

    try:
        with Image.open(io.BytesIO(content)) as im:
            im.verify()
    except Exception:
        raise ValueError("corrupt_or_unknown_image")

    try:
        with Image.open(io.BytesIO(content)) as im2:
            fmt = (im2.format or "").upper()
            im2.load()
    except Exception:
        raise ValueError("invalid_image_payload")

    mapping = {
        "JPEG": ("jpeg", "image/jpeg"),
        "PNG": ("png", "image/png"),
        "GIF": ("gif", "image/gif"),
        "WEBP": ("webp", "image/webp"),
    }
    if fmt not in mapping:
        raise ValueError("unsupported_image_type")

    ext, mime = mapping[fmt]
    return ext, mime


def upload_risk_score(
    *,
    declared_ext: str,
    sniffed_ext: str,
    filename: str,
    size: int,
    max_size: int,
) -> int:
    """Целое 0–10: чем выше, тем агрессивнее включаются доп. проверки (ClamAV)."""
    risk = 0
    if declared_ext != sniffed_ext:
        risk += 3

    fname = (filename or "").strip().lower()
    if fname and ("/" in fname or "\\" in fname or fname.startswith(".")):
        risk += 4
    bad_sub = ("..", ".php", ".jsp", ".asp", ".sh", ".cmd", ".bat", ".htm", ".html", ".exe")
    if any(s in fname for s in bad_sub):
        risk += 5

    if len(fname) > 180:
        risk += 1

    if max_size and size / max(max_size, 1) > 0.92:
        risk += 1

    if fname.count(".") >= 3:
        risk += 2

    return min(risk, 10)


def maybe_scan_clamav(
    content: bytes,
    risk: int,
    host: str,
    port: int,
    *,
    min_risk: int = CLAM_SCAN_MIN_RISK,
    timeout_sec: float = 12.0,
) -> None:
    """Без clamav_host — no-op; иначе при risk≥min попытаться INSTREAM-scan."""
    h = (host or "").strip()
    if risk < min_risk or not h:
        return
    try:
        ok = _clamd_instream_scan(h, int(port), content, timeout_sec=timeout_sec)
    except OSError as e:
        logger.warning("clamav unreachable host=%s: %s", h, e)
        raise RuntimeError("clamav_unavailable") from e
    if not ok:
        raise ValueError("virus_found")


def _clamd_instream_scan(host: str, port: int, data: bytes, *, timeout_sec: float) -> bool:
    """True если чисто, False если FOUND. Raises OSError при сокете/ответе."""
    sock = socket.create_connection((host, port), timeout=timeout_sec)
    try:
        sock.settimeout(timeout_sec)
        sock.sendall(b"zINSTREAM\0")
        chunk_size = 2048
        offset = 0
        while offset < len(data):
            piece = data[offset : offset + chunk_size]
            sock.sendall(struct.pack(">I", len(piece)) + piece)
            offset += len(piece)
        sock.sendall(struct.pack(">I", 0))
        buf = b""
        while True:
            part = sock.recv(4096)
            if not part:
                break
            buf += part
            if b"\n" in buf:
                break
        line = buf.decode("utf-8", errors="replace").strip()
        if not line:
            raise OSError("empty clamd response")
        if " FOUND" in line or line.endswith("FOUND"):
            return False
        if line.endswith("OK"):
            return True
        logger.warning("unexpected clamd line: %r", line)
        raise OSError(f"unexpected clamd response: {line!r}")
    finally:
        sock.close()
