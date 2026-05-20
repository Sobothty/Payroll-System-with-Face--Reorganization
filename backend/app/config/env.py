import os
from pathlib import Path


def read_env_file_value(key: str) -> str:
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


def get_env_value(key: str, default: str = "") -> str:
    value = os.getenv(key, "").strip()
    if value:
        return value

    file_value = read_env_file_value(key)
    if file_value:
        return file_value

    return default
