"""
Отправка Telegram-уведомлений о новых заявках.

Использует Bot API через httpx. Вызывается из роутеров leads после успешного upsert.
"""
import logging

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


def _val(v) -> str:
    """Возвращает значение или прочерк если пусто."""
    return str(v).strip() if v and str(v).strip() else "—"


def _privacy_lines(lead) -> list[str]:
    """Строки про согласие на обработку ПДн (если поля есть в модели)."""
    if not getattr(lead, "privacy_consent", False):
        return ["⚠️ <b>Согласие ПДн:</b> нет"]
    at = getattr(lead, "privacy_consent_at", None)
    if at is not None:
        try:
            ts = at.strftime("%Y-%m-%d %H:%M UTC")
        except Exception:
            ts = str(at)
        return [f"✅ <b>Согласие ПДн:</b> да · {ts}"]
    return ["✅ <b>Согласие ПДн:</b> да"]


def _build_quick_message(lead, page_time_seconds: int = 0) -> str:
    lines = [
        "🔔 <b>Новая быстрая заявка!</b>",
        "",
        f"👤 <b>Имя:</b> {_val(lead.first_name)} {_val(lead.last_name)}",
        f"📱 <b>Телефон:</b> {_val(lead.phone)}",
        f"🌐 <b>Язык:</b> {_val(lead.language)}",
    ]
    if page_time_seconds > 0:
        lines.append(f"🕐 <b>Время на странице:</b> {page_time_seconds} сек")
    lines.extend(_privacy_lines(lead))
    lines.extend([
        "",
        "<b>📊 Источник трафика</b>",
        f"  Referrer: {_val(lead.referrer)}",
        f"  UTM source: {_val(lead.utm_source)}",
        f"  UTM medium: {_val(lead.utm_medium)}",
        f"  UTM campaign: {_val(lead.utm_campaign)}",
        "",
        f"🌍 <b>IP:</b> {_val(lead.ip_address)}",
        f"🖥 <b>User-Agent:</b> {_val(lead.user_agent)[:80]}…",
        "",
        f"🆔 Lead ID: <code>{lead.id}</code>",
    ])
    return "\n".join(lines)


def _build_enquire_message(lead) -> str:
    lines = [
        "📋 <b>Новая полная заявка (Enquire)!</b>",
        "",
        "<b>👤 Контакты</b>",
        f"  Имя: {_val(lead.first_name)} {_val(lead.last_name)} {_val(lead.middle_name)}",
        f"  Телефон: {_val(lead.phone)}",
        f"  Email: {_val(lead.email)}",
        f"  Язык: {_val(lead.language)}",
        *_privacy_lines(lead),
        "",
        "<b>🏢 Бизнес</b>",
        f"  Ниша: {_val(lead.business_niche)}",
        f"  Размер компании: {_val(lead.company_size)}",
        f"  Объём задачи: {_val(lead.task_volume)}",
        f"  Роль: {_val(lead.role)}",
        f"  О бизнесе: {_val(lead.business_info)[:200]}",
        "",
        "<b>🎯 Задача</b>",
        f"  Тип задачи: {_val(lead.task_type)}",
        f"  Продукт: {_val(lead.interested_product)}",
        f"  Бюджет: {_val(lead.budget)}",
        f"  Срок: {_val(lead.timeline)}",
        "",
        "<b>💬 Коммуникация</b>",
        f"  Предпочтение: {_val(lead.contact_preference)}",
        f"  Удобное время: {_val(lead.preferred_time)}",
        f"  Комментарий: {_val(lead.comments)[:300]}",
        "",
        "<b>📊 Источник трафика</b>",
        f"  Referrer: {_val(lead.referrer)}",
        f"  UTM source: {_val(lead.utm_source)}",
        f"  UTM medium: {_val(lead.utm_medium)}",
        f"  UTM campaign: {_val(lead.utm_campaign)}",
        "",
        f"🌍 <b>IP:</b> {_val(lead.ip_address)}",
        f"🆔 Lead ID: <code>{lead.id}</code>",
    ]
    return "\n".join(lines)


async def notify_quick_lead(lead, page_time_seconds: int = 0) -> None:
    """Отправить уведомление о быстрой заявке (имя + телефон)."""
    await _send(_build_quick_message(lead, page_time_seconds))


async def notify_enquire_lead(lead) -> None:
    """Отправить уведомление о полной заявке (/enquire)."""
    await _send(_build_enquire_message(lead))


async def _send(text: str) -> None:
    token = settings.telegram_bot_token

    if not token or token == "your_bot_token_here":
        logger.warning("Telegram не настроен: TELEGRAM_BOT_TOKEN не задан")
        return

    chat_ids = [c for c in [settings.telegram_chat_id, settings.telegram_chat_id_2] if c]
    if not chat_ids:
        logger.warning("Telegram не настроен: ни один TELEGRAM_CHAT_ID не задан")
        return

    url = TELEGRAM_API.format(token=token)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for chat_id in chat_ids:
                try:
                    resp = await client.post(url, json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    })
                    if not resp.is_success:
                        logger.error("Telegram API error chat_id=%s %s: %s", chat_id, resp.status_code, resp.text)
                except Exception as exc:
                    logger.error("Ошибка отправки Telegram chat_id=%s: %s", chat_id, exc)
    except Exception as exc:
        logger.error("Ошибка отправки Telegram-уведомления: %s", exc)
