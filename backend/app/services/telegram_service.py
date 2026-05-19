import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class TelegramServiceError(Exception):
    pass


_LAST_UPDATE_ID = 0


def _read_env_file_value(key: str) -> str:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return ""

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        current_key, value = line.split("=", 1)
        if current_key.strip() != key:
            continue
        return value.strip().strip("'").strip('"')
    return ""


def _get_env_value(key: str) -> str:
    value = os.getenv(key, "").strip()
    if value:
        return value
    return _read_env_file_value(key)


def get_bot_token() -> str:
    token = _get_env_value("TELEGRAM_BOT_TOKEN")
    if not token:
        raise TelegramServiceError("Telegram bot token is not configured")
    return token


def get_bot_username() -> str:
    return _get_env_value("TELEGRAM_BOT_USERNAME")


def get_telegram_updates() -> list[dict]:
    global _LAST_UPDATE_ID

    token = get_bot_token()
    request = Request(
        url=f"https://api.telegram.org/bot{token}/getUpdates?offset={_LAST_UPDATE_ID}&timeout=0",
        method="GET",
    )
    try:
        with urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise TelegramServiceError(f"Telegram HTTP error: {exc.code}") from exc
    except URLError as exc:
        raise TelegramServiceError(f"Telegram network error: {exc.reason}") from exc

    if not data.get("ok"):
        raise TelegramServiceError(data.get("description", "Telegram getUpdates failed"))

    updates = data.get("result", [])
    if updates:
        _LAST_UPDATE_ID = max(int(update.get("update_id", 0)) for update in updates) + 1
    return updates


def send_telegram_message(chat_id: str, text: str) -> dict:
    token = get_bot_token()
    payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
    request = Request(
        url=f"https://api.telegram.org/bot{token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise TelegramServiceError(f"Telegram HTTP error: {exc.code}") from exc
    except URLError as exc:
        raise TelegramServiceError(f"Telegram network error: {exc.reason}") from exc

    if not data.get("ok"):
        raise TelegramServiceError(data.get("description", "Telegram send failed"))
    return data


def send_telegram_message_safely(*, chat_id: str | None, title: str, message: str) -> bool:
    if not chat_id:
        return False
    try:
        send_telegram_message(chat_id, f"{title}\n\n{message}")
    except TelegramServiceError:
        return False
    return True
