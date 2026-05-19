from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.schemas import SelfServiceOverviewOut
from app.security import get_current_user
from app.services.leave_service import ensure_leave_balance
from app.services.notification_service import list_notifications, send_test_telegram_notification
from app.services.telegram_service import TelegramServiceError, get_bot_username
from app.services.self_service_service import get_self_service_overview


router = APIRouter(prefix="/api/self-service", tags=["self-service"])


def _require_employee(current_user):
    if not current_user.employee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee account required")
    return current_user


@router.get("/overview", response_model=SelfServiceOverviewOut)
def overview(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    return get_self_service_overview(db, employee_id=current_user.employee_id)


@router.get("/leave-balance")
def leave_balance(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    employee = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    balance = ensure_leave_balance(db, employee)
    db.commit()
    db.refresh(balance)
    return {
        "annual_remaining": balance.annual_remaining,
        "sick_remaining": balance.sick_remaining,
        "unpaid_used": balance.unpaid_used,
        "updated_at": balance.updated_at,
    }


@router.get("/notifications")
def notifications(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    items = list_notifications(db, employee_id=current_user.employee_id)
    return [
        {
            "id": item.id,
            "title": item.title,
            "message": item.message,
            "category": item.category,
            "is_read": item.is_read,
            "created_at": item.created_at,
        }
        for item in items
    ]


@router.get("/telegram/meta")
def telegram_meta():
    return {"bot_username": get_bot_username()}


@router.post("/telegram/test")
def test_telegram(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    current_user = _require_employee(current_user)
    employee = db.query(Employee).filter(Employee.id == current_user.employee_id).first()
    try:
        return send_test_telegram_notification(db, employee=employee)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except TelegramServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
