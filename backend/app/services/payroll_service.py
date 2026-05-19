from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import AttendanceLog, Deduction, Employee, PayrollDetail, PayrollRun, User
from app.schemas import PayrollRunRequest
from app.services.compensation_service import resolve_compensation_for_period
from app.services.audit_service import record_audit
from app.services.payslip_service import generate_payslip_pdf
from app.services.settings_service import get_settings


def _money(value: float | Decimal) -> float:
    return round(float(value), 2)


def _collect_adjustments(adjustments) -> dict[str, dict[str, float]]:
    items: dict[str, dict[str, float]] = defaultdict(lambda: {"bonus": 0, "allowance": 0})
    for row in adjustments:
        items[row.employee_id] = {"bonus": row.bonus, "allowance": row.allowance}
    return items


def calculate_payroll(db: Session, *, period_start, period_end, department: str | None = None) -> dict:
    query = db.query(Employee).filter(Employee.status == "active")
    if department and department != "all":
        query = query.filter(Employee.department == department)
    employees = query.all()
    settings = get_settings(db)
    rows = []
    totals = {"gross": 0.0, "tax": 0.0, "insurance": 0.0, "pension": 0.0, "deductions": 0.0, "net": 0.0}

    for employee in employees:
        attendance = (
            db.query(AttendanceLog)
            .filter(AttendanceLog.employee_id == employee.id, AttendanceLog.date >= period_start, AttendanceLog.date <= period_end)
            .all()
        )
        days_worked = len(attendance)
        hours_worked = sum(log.hours_worked or 0 for log in attendance)
        overtime_hours = sum(log.overtime_hours or 0 for log in attendance)
        compensation = resolve_compensation_for_period(db, employee_id=employee.id, as_of=period_end)
        pay_type = compensation.pay_type if compensation else employee.pay_type
        base_salary = float(compensation.base_salary) if compensation else float(employee.base_salary)

        if pay_type == "monthly":
            gross = base_salary
        elif pay_type == "daily":
            gross = base_salary * days_worked
        else:
            gross = base_salary * hours_worked

        overtime_pay = (base_salary / 8 / 22) * settings.overtime_multiplier * overtime_hours if base_salary else 0
        gross_total = gross + overtime_pay
        tax = gross_total * settings.income_tax_rate
        insurance = gross_total * settings.insurance_rate
        pension = gross_total * settings.pension_rate
        loan_deduction = sum(float(item.amount) for item in db.query(Deduction).filter(Deduction.employee_id == employee.id, Deduction.type == "loan"))
        net = gross_total - tax - insurance - pension - loan_deduction

        rows.append(
            {
                "employee_id": employee.id,
                "employee_name": employee.full_name,
                "department": employee.department,
                "pay_type": pay_type,
                "base_salary": _money(base_salary),
                "compensation_effective_from": compensation.effective_from.isoformat() if compensation else employee.hire_date.isoformat(),
                "days_worked": days_worked,
                "hours_worked": round(hours_worked, 2),
                "overtime_hours": round(overtime_hours, 2),
                "gross": _money(gross_total),
                "tax": _money(tax),
                "insurance": _money(insurance),
                "pension": _money(pension),
                "loan_deduction": _money(loan_deduction),
                "bonus": 0.0,
                "allowance": 0.0,
                "net": _money(net),
            }
        )
        totals["gross"] += gross_total
        totals["tax"] += tax
        totals["insurance"] += insurance
        totals["pension"] += pension
        totals["deductions"] += tax + insurance + pension + loan_deduction
        totals["net"] += net

    return {"items": rows, "totals": {key: _money(value) for key, value in totals.items()}}


def run_payroll(db: Session, payload: PayrollRunRequest, actor: User | None = None) -> PayrollRun:
    result = calculate_payroll(db, period_start=payload.period_start, period_end=payload.period_end, department=payload.department)
    items = result["items"]
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employees found for this payroll run")

    version = 1
    if payload.correction_of_run_id is not None:
        source_run = db.query(PayrollRun).filter(PayrollRun.id == payload.correction_of_run_id).first()
        if not source_run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source payroll run not found")
        if source_run.locked_at is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only locked payroll runs can be corrected")
        version = source_run.version + 1

    adjustments = _collect_adjustments(payload.adjustments)
    payroll_run = PayrollRun(
        period_start=payload.period_start,
        period_end=payload.period_end,
        run_date=datetime.utcnow(),
        processed_by=payload.processed_by,
        status="draft",
        correction_of_run_id=payload.correction_of_run_id,
        version=version,
        total_gross=result["totals"]["gross"],
        total_deductions=result["totals"]["deductions"],
        total_net=result["totals"]["net"],
    )
    db.add(payroll_run)
    db.flush()

    settings = get_settings(db)
    for item in items:
        adjustment = adjustments.get(item["employee_id"], {"bonus": 0, "allowance": 0})
        net_pay = item["net"] + adjustment["bonus"] + adjustment["allowance"]
        detail = PayrollDetail(
            payroll_run_id=payroll_run.id,
            employee_id=item["employee_id"],
            gross_pay=item["gross"],
            tax_deduction=item["tax"],
            insurance_deduction=item["insurance"],
            pension_deduction=item["pension"],
            bonus=adjustment["bonus"],
            allowance=adjustment["allowance"],
            loan_deduction=item["loan_deduction"],
            net_pay=round(net_pay, 2),
        )
        db.add(detail)
        db.flush()
        employee = db.query(Employee).filter(Employee.id == item["employee_id"]).first()
        detail.payslip_path = generate_payslip_pdf(settings, payroll_run, detail, employee)

    db.commit()
    db.refresh(payroll_run)
    record_audit(
        db,
        action="payroll.run",
        table_name="payroll_runs",
        record_id=str(payroll_run.id),
        new_value={
            "status": payroll_run.status,
            "period_start": payload.period_start,
            "period_end": payload.period_end,
            "version": payroll_run.version,
            "correction_of_run_id": payroll_run.correction_of_run_id,
        },
        actor=actor,
    )
    if payload.status in {"approved", "paid"}:
        payroll_run = approve_payroll_run(db, payroll_run.id, actor=actor, mark_paid=payload.status == "paid")
    return payroll_run


def approve_payroll_run(db: Session, payroll_run_id: int, actor: User | None = None, *, mark_paid: bool = False) -> PayrollRun:
    payroll_run = db.query(PayrollRun).options(joinedload(PayrollRun.details)).filter(PayrollRun.id == payroll_run_id).first()
    if not payroll_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")
    if payroll_run.locked_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payroll run is already locked")
    payroll_run.status = "approved"
    payroll_run.approved_by = actor.username if actor else "system"
    payroll_run.approved_at = datetime.utcnow()
    payroll_run.locked_at = payroll_run.approved_at
    if mark_paid:
        payroll_run.status = "paid"
        payroll_run.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(payroll_run)
    record_audit(
        db,
        action="payroll.approve",
        table_name="payroll_runs",
        record_id=str(payroll_run.id),
        new_value={
            "status": payroll_run.status,
            "approved_by": payroll_run.approved_by,
            "approved_at": payroll_run.approved_at,
            "paid_at": payroll_run.paid_at,
            "locked_at": payroll_run.locked_at,
        },
        actor=actor,
    )
    return payroll_run
