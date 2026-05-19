import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Employee, User
from app.schemas import EmployeeCreate, EmployeeUpdate, ProfileUpdate
from app.security import hash_password
from app.services.compensation_service import add_compensation_history
from app.services.audit_service import record_audit
from app.services.leave_service import ensure_leave_balance


def list_employees(
    db: Session,
    *,
    search: str | None = None,
    department: str | None = None,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 20,
):
    query = db.query(Employee).options(joinedload(Employee.compensation_history))
    if search:
        like = f"%{search.strip()}%"
        query = query.filter((Employee.full_name.ilike(like)) | (Employee.employee_code.ilike(like)))
    if department:
        query = query.filter(Employee.department == department)
    if status_filter:
        query = query.filter(Employee.status == status_filter)
    total = query.count()
    items = query.order_by(Employee.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


def get_employee_or_404(db: Session, employee_id: str) -> Employee:
    employee = db.query(Employee).options(joinedload(Employee.compensation_history)).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


def create_employee(db: Session, payload: EmployeeCreate, actor: User | None = None) -> Employee:
    duplicate = db.query(Employee).filter(
        (Employee.employee_code == payload.employee_code) | (Employee.email == payload.email)
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee code or email already exists")

    employee_fields = payload.model_dump(exclude={"temporary_password", "compensation_effective_from", "compensation_reason"})
    employee_fields["initial_password"] = ""
    employee = Employee(id=str(uuid.uuid4()), **employee_fields)
    db.add(employee)
    db.flush()
    add_compensation_history(
        db,
        employee=employee,
        effective_from=payload.compensation_effective_from or payload.hire_date,
        pay_type=payload.pay_type,
        base_salary=payload.base_salary,
        reason=payload.compensation_reason or "Initial employment package",
    )

    username = payload.employee_code.lower()
    user = User(
        employee_id=employee.id,
        username=username,
        hashed_password=hash_password(payload.temporary_password),
        role="employee",
        must_change_password=True,
    )
    db.add(user)
    ensure_leave_balance(db, employee)
    db.commit()
    db.refresh(employee)

    record_audit(
        db,
        action="employee.create",
        table_name="employees",
        record_id=employee.id,
        new_value={"full_name": employee.full_name, "employee_code": employee.employee_code, "must_change_password": True},
        actor=actor,
    )
    return employee


def update_employee(db: Session, employee: Employee, payload: EmployeeUpdate, actor: User | None = None) -> Employee:
    previous = {"full_name": employee.full_name, "status": employee.status, "department": employee.department}
    updates = payload.model_dump(exclude_unset=True)
    compensation_changed = any(key in updates for key in ("pay_type", "base_salary"))
    effective_from = updates.pop("compensation_effective_from", None)
    compensation_reason = updates.pop("compensation_reason", None)
    for field, value in updates.items():
        setattr(employee, field, value)
    if compensation_changed:
        add_compensation_history(
            db,
            employee=employee,
            effective_from=effective_from or date.today(),
            pay_type=employee.pay_type,
            base_salary=float(employee.base_salary),
            reason=compensation_reason or "Compensation update",
        )
    db.commit()
    db.refresh(employee)
    record_audit(
        db,
        action="employee.update",
        table_name="employees",
        record_id=employee.id,
        old_value=previous,
        new_value={"full_name": employee.full_name, "status": employee.status, "department": employee.department},
        actor=actor,
    )
    return employee


def soft_delete_employee(db: Session, employee: Employee, actor: User | None = None) -> Employee:
    employee.status = "inactive"
    db.commit()
    db.refresh(employee)
    record_audit(
        db,
        action="employee.soft_delete",
        table_name="employees",
        record_id=employee.id,
        new_value={"status": employee.status},
        actor=actor,
    )
    return employee


def update_self_profile(db: Session, employee: Employee, payload: ProfileUpdate, actor: User | None = None) -> Employee:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    record_audit(
        db,
        action="employee.self_update",
        table_name="employees",
        record_id=employee.id,
        new_value={
            "email": employee.email,
            "phone": employee.phone,
            "telegram_username": employee.telegram_username,
            "telegram_chat_id": employee.telegram_chat_id,
            "telegram_notifications_enabled": employee.telegram_notifications_enabled,
        },
        actor=actor,
    )
    return employee
