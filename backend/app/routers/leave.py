from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee, LeaveRequest
from app.schemas import LeaveApprovalRequest, LeaveRequestCreate
from app.security import get_current_user, require_role
from app.services.leave_service import create_leave_request, ensure_leave_balance, get_leave_or_404, update_leave_status


router = APIRouter(prefix="/api/leave", tags=["leave"])


@router.get("")
def index(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(LeaveRequest)
    if current_user.role != "admin":
        query = query.filter(LeaveRequest.employee_id == current_user.employee_id)
    rows = query.order_by(LeaveRequest.id.desc()).all()
    return [
        {
            "id": row.id,
            "employee_id": row.employee_id,
            "leave_type": row.leave_type,
            "start_date": row.start_date,
            "end_date": row.end_date,
            "status": row.status,
            "approved_by": row.approved_by,
            "reason": row.reason,
        }
        for row in rows
    ]


@router.post("")
def create(payload: LeaveRequestCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        payload = payload.model_copy(update={"employee_id": current_user.employee_id})
    return create_leave_request(db, payload, actor=current_user)


@router.post("/{leave_id}/decision")
def decide(leave_id: int, payload: LeaveApprovalRequest, current_user=Depends(require_role("admin")), db: Session = Depends(get_db)):
    leave = get_leave_or_404(db, leave_id)
    return update_leave_status(db, leave, payload.status, current_user.username, actor=current_user)


@router.get("/balances/{employee_id}")
def balance_for_employee(employee_id: str, current_user=Depends(require_role("admin")), db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    balance = ensure_leave_balance(db, employee)
    db.commit()
    db.refresh(balance)
    return {
        "annual_remaining": balance.annual_remaining,
        "sick_remaining": balance.sick_remaining,
        "unpaid_used": balance.unpaid_used,
        "updated_at": balance.updated_at,
    }
