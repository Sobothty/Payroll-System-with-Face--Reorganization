import secrets
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee, TelegramLinkSession
from app.services.telegram_service import get_bot_username


def _build_start_token() -> str:
    return secrets.token_urlsafe(24).replace("-", "A").replace("_", "B")[:48]


def create_telegram_link_session(db: Session, *, employee: Employee) -> TelegramLinkSession:
    existing_pending = (
        db.query(TelegramLinkSession)
        .filter(TelegramLinkSession.employee_id == employee.id, TelegramLinkSession.status == "pending")
        .all()
    )
    for pending in existing_pending:
        pending.status = "replaced"

    session = TelegramLinkSession(
        employee_id=employee.id,
        start_token=_build_start_token(),
        status="pending",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_telegram_link_session_or_404(db: Session, *, employee: Employee, start_token: str) -> TelegramLinkSession:
    session = (
        db.query(TelegramLinkSession)
        .filter(TelegramLinkSession.employee_id == employee.id, TelegramLinkSession.start_token == start_token)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telegram link session not found")
    return session


def build_connect_url(start_token: str) -> str:
    bot_username = get_bot_username()
    if not bot_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram bot username is not configured")
    return f"https://t.me/{bot_username}?start=link_{start_token}"


def connect_employee_from_start(
    db: Session,
    *,
    start_token: str,
    chat_id: str,
    telegram_username: str | None,
) -> TelegramLinkSession | None:
    session = db.query(TelegramLinkSession).filter(TelegramLinkSession.start_token == start_token).first()
    if not session:
        return None
    employee = db.query(Employee).filter(Employee.id == session.employee_id).first()
    if not employee:
        return None

    employee.telegram_chat_id = str(chat_id)
    employee.telegram_username = telegram_username
    employee.telegram_notifications_enabled = True

    (
        db.query(TelegramLinkSession)
        .filter(
            TelegramLinkSession.employee_id == employee.id,
            TelegramLinkSession.status == "pending",
            TelegramLinkSession.id != session.id,
        )
        .update({"status": "replaced"}, synchronize_session=False)
    )

    session.status = "connected"
    session.telegram_chat_id = str(chat_id)
    session.telegram_username = telegram_username
    session.connected_at = datetime.utcnow()

    db.commit()
    db.refresh(session)
    return session


def disconnect_employee_telegram(db: Session, *, employee: Employee) -> Employee:
    employee.telegram_chat_id = None
    employee.telegram_username = None
    employee.telegram_notifications_enabled = False
    db.commit()
    db.refresh(employee)
    return employee
