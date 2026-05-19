from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.security import get_current_user
from app.services.telegram_link_service import (
    build_connect_url,
    connect_employee_from_start,
    create_telegram_link_session,
    disconnect_employee_telegram,
    get_telegram_link_session_or_404,
)
from app.services.telegram_service import (
    TelegramServiceError,
    get_bot_username,
    get_telegram_updates,
    send_telegram_message_safely,
)


router = APIRouter(prefix="/api/telegram", tags=["telegram"])


def _require_employee(current_user):
    if not current_user.employee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee account required")
    return current_user


@router.post("/connect")
def connect_start(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    employee = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    session = create_telegram_link_session(db, employee=employee)
    return {
        "start_token": session.start_token,
        "connect_url": build_connect_url(session.start_token),
        "bot_username": get_bot_username(),
    }


@router.get("/connect/{start_token}")
def connect_status(start_token: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    employee = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    try:
        updates = get_telegram_updates()
    except TelegramServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    for update in updates:
        message = update.get("message") or update.get("edited_message")
        if not message:
            continue
        text = (message.get("text") or "").strip()
        if not text.startswith("/start link_"):
            continue
        chat = message.get("chat") or {}
        sender = message.get("from") or {}
        matched_session = connect_employee_from_start(
            db,
            start_token=text.split("/start link_", 1)[1].strip().split()[0],
            chat_id=str(chat.get("id")),
            telegram_username=sender.get("username"),
        )
        if matched_session and matched_session.telegram_chat_id:
            send_telegram_message_safely(
                chat_id=matched_session.telegram_chat_id,
                title="PulseLedger Telegram Connected",
                message="Your Telegram account is now linked. You will receive employee notifications here.",
            )

    session = get_telegram_link_session_or_404(db, employee=employee, start_token=start_token)
    return {
        "start_token": session.start_token,
        "status": session.status,
        "telegram_username": session.telegram_username,
        "telegram_chat_id": session.telegram_chat_id,
        "connected_at": session.connected_at,
    }


@router.post("/disconnect")
def disconnect(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    employee = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    disconnect_employee_telegram(db, employee=employee)
    return {"status": "disconnected"}
