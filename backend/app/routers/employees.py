from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.schema import EmployeeCreate, EmployeeOut, EmployeeUpdate, ProfileUpdate
from app.security import get_current_user, require_role
from app.services.employee_service import (
    create_employee,
    get_employee_or_404,
    list_employees,
    soft_delete_employee,
    update_employee,
    update_self_profile,
)


router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("")
def index(
    search: str | None = None,
    department: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = 1,
    page_size: int = 20,
    _: object = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    skip = max(page - 1, 0) * page_size
    return list_employees(db, search=search, department=department, status_filter=status_filter, skip=skip, limit=page_size)


@router.get("/{employee_id}", response_model=EmployeeOut)
def show(employee_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    employee = get_employee_or_404(db, employee_id)
    if current_user.role != "admin" and current_user.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return employee


@router.get("/{employee_id}/compensation-history")
def compensation_history(employee_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    employee = get_employee_or_404(db, employee_id)
    if current_user.role != "admin" and current_user.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return [
        {
            "id": item.id,
            "effective_from": item.effective_from,
            "pay_type": item.pay_type,
            "base_salary": float(item.base_salary),
            "reason": item.reason,
            "created_at": item.created_at,
        }
        for item in employee.compensation_history
    ]


@router.post("", response_model=EmployeeOut)
def create(payload: EmployeeCreate, current_user=Depends(require_role("admin")), db: Session = Depends(get_db)):
    return create_employee(db, payload, actor=current_user)


@router.put("/{employee_id}", response_model=EmployeeOut)
def update(employee_id: str, payload: EmployeeUpdate, current_user=Depends(require_role("admin")), db: Session = Depends(get_db)):
    employee = get_employee_or_404(db, employee_id)
    return update_employee(db, employee, payload, actor=current_user)


@router.delete("/{employee_id}", response_model=EmployeeOut)
def delete(employee_id: str, current_user=Depends(require_role("admin")), db: Session = Depends(get_db)):
    employee = get_employee_or_404(db, employee_id)
    return soft_delete_employee(db, employee, actor=current_user)


@router.patch("/me/profile", response_model=EmployeeOut)
def update_profile(payload: ProfileUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    employee = get_employee_or_404(db, current_user.employee_id)
    return update_self_profile(db, employee, payload, actor=current_user)
