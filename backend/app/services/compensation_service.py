from datetime import date

from sqlalchemy.orm import Session

from app.models import Employee, EmployeeCompensationHistory


def add_compensation_history(
    db: Session,
    *,
    employee: Employee,
    effective_from: date,
    pay_type: str,
    base_salary: float,
    reason: str | None = None,
) -> EmployeeCompensationHistory:
    entry = EmployeeCompensationHistory(
        employee_id=employee.id,
        effective_from=effective_from,
        pay_type=pay_type,
        base_salary=base_salary,
        reason=reason,
    )
    db.add(entry)
    db.flush()
    return entry


def resolve_compensation_for_period(db: Session, *, employee_id: str, as_of: date) -> EmployeeCompensationHistory | None:
    return (
        db.query(EmployeeCompensationHistory)
        .filter(EmployeeCompensationHistory.employee_id == employee_id, EmployeeCompensationHistory.effective_from <= as_of)
        .order_by(EmployeeCompensationHistory.effective_from.desc(), EmployeeCompensationHistory.id.desc())
        .first()
    )
