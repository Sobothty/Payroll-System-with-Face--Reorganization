from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee, LeaveBalance, LeaveRequest, User
from app.schema import LeaveRequestCreate
from app.services.audit_service import record_audit
from app.services.notification_service import create_notification
from app.services.settings_service import get_settings


def ensure_leave_balance(db: Session, employee: Employee) -> LeaveBalance:
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    balance = db.query(LeaveBalance).filter(LeaveBalance.employee_id == employee.id).first()
    if balance:
        return balance
    settings = get_settings(db)
    balance = LeaveBalance(
        employee_id=employee.id,
        annual_remaining=float(settings.annual_leave_days),
        sick_remaining=float(settings.sick_leave_days),
        unpaid_used=0,
    )
    db.add(balance)
    db.flush()
    return balance


def create_leave_request(db: Session, payload: LeaveRequestCreate, actor: User | None = None) -> LeaveRequest:
    leave = LeaveRequest(**payload.model_dump())
    db.add(leave)
    employee = db.query(Employee).filter(Employee.id == leave.employee_id).first()
    if employee:
        ensure_leave_balance(db, employee)
    db.commit()
    db.refresh(leave)
    record_audit(
        db,
        action="leave.submit",
        table_name="leave_requests",
        record_id=str(leave.id),
        new_value={"employee_id": leave.employee_id, "status": leave.status},
        actor=actor,
    )
    create_notification(
        db,
        employee_id=leave.employee_id,
        title="Leave request submitted",
        message=f"Your {leave.leave_type} leave request from {leave.start_date} to {leave.end_date} is pending approval.",
        category="leave",
    )
    db.commit()
    return leave


def get_leave_or_404(db: Session, leave_id: int) -> LeaveRequest:
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    return leave


def update_leave_status(db: Session, leave: LeaveRequest, status_value: str, approver: str, actor: User | None = None) -> LeaveRequest:
    previous_status = leave.status
    leave.status = status_value
    leave.approved_by = approver
    employee = db.query(Employee).filter(Employee.id == leave.employee_id).first()
    balance = ensure_leave_balance(db, employee) if employee else None
    leave_days = max((leave.end_date - leave.start_date).days + 1, 0)
    if previous_status != "approved" and status_value == "approved" and balance is not None:
        if leave.leave_type == "annual":
            balance.annual_remaining = max(0, round(balance.annual_remaining - leave_days, 2))
        elif leave.leave_type == "sick":
            balance.sick_remaining = max(0, round(balance.sick_remaining - leave_days, 2))
        elif leave.leave_type == "unpaid":
            balance.unpaid_used = round(balance.unpaid_used + leave_days, 2)
    db.commit()
    db.refresh(leave)
    record_audit(
        db,
        action=f"leave.{status_value}",
        table_name="leave_requests",
        record_id=str(leave.id),
        new_value={"status": leave.status, "approved_by": leave.approved_by},
        actor=actor,
    )
    create_notification(
        db,
        employee_id=leave.employee_id,
        title=f"Leave request {leave.status}",
        message=f"Your leave request for {leave.start_date} to {leave.end_date} was {leave.status}.",
        category="leave",
    )
    db.commit()
    return leave
