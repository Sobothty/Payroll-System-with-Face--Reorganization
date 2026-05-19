from sqlalchemy.orm import Session

from app.models import Employee, EmployeeNotification
from app.services.telegram_service import get_bot_username, send_telegram_message, send_telegram_message_safely


def create_notification(
    db: Session,
    *,
    employee_id: str,
    title: str,
    message: str,
    category: str = "general",
) -> EmployeeNotification:
    notification = EmployeeNotification(
        employee_id=employee_id,
        title=title,
        message=message,
        category=category,
    )
    db.add(notification)
    db.flush()
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.telegram_notifications_enabled and employee.telegram_chat_id:
        send_telegram_message_safely(chat_id=employee.telegram_chat_id, title=title, message=message)
    return notification


def list_notifications(db: Session, *, employee_id: str, limit: int = 20) -> list[EmployeeNotification]:
    return (
        db.query(EmployeeNotification)
        .filter(EmployeeNotification.employee_id == employee_id)
        .order_by(EmployeeNotification.created_at.desc())
        .limit(limit)
        .all()
    )


def send_test_telegram_notification(db: Session, *, employee: Employee) -> dict:
    if not employee.telegram_notifications_enabled:
        raise ValueError("Telegram notifications are disabled for this employee")
    if not employee.telegram_chat_id:
        raise ValueError("Telegram chat ID is missing")

    result = send_telegram_message(
        employee.telegram_chat_id,
        "PulseLedger Telegram test\n\nYour Telegram notifications are connected successfully.",
    )
    return {
        "status": "sent",
        "telegram_username": employee.telegram_username,
        "telegram_chat_id": employee.telegram_chat_id,
        "bot_username": get_bot_username(),
        "telegram_result": result,
    }
