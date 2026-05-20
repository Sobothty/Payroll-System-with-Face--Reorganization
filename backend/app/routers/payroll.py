from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models import PayrollRun
from app.schema import PayrollCalculateRequest, PayrollRunRequest
from app.security import require_role
from app.services.payroll_service import approve_payroll_run, calculate_payroll, get_payroll_setup, run_payroll


router = APIRouter(prefix="/api/payroll", tags=["payroll"])


@router.post("/calculate")
def calculate(payload: PayrollCalculateRequest, db: Session = Depends(get_db), _: object = Depends(require_role("admin", "payroll_admin", "approver"))):
    return calculate_payroll(
        db,
        period_start=payload.period_start,
        period_end=payload.period_end,
        department=payload.department,
        adjustments=payload.adjustments,
    )


@router.get("/setup")
def setup(db: Session = Depends(get_db), _: object = Depends(require_role("admin", "payroll_admin", "approver"))):
    return get_payroll_setup(db)


@router.post("/run")
def run(payload: PayrollRunRequest, current_user=Depends(require_role("admin", "payroll_admin")), db: Session = Depends(get_db)):
    return run_payroll(db, payload, actor=current_user)


@router.post("/{payroll_run_id}/approve")
def approve(payroll_run_id: int, current_user=Depends(require_role("admin", "approver")), db: Session = Depends(get_db)):
    return approve_payroll_run(db, payroll_run_id, actor=current_user)


@router.get("/runs")
def list_runs(db: Session = Depends(get_db), _: object = Depends(require_role("admin", "payroll_admin", "approver"))):
    runs = db.query(PayrollRun).order_by(PayrollRun.run_date.desc()).all()
    return [
        {
            "id": row.id,
            "pay_period_id": row.pay_period_id,
            "period_start": row.period_start,
            "period_end": row.period_end,
            "run_date": row.run_date,
            "processed_by": row.processed_by,
            "department_scope": row.department_scope,
            "pay_cycle": row.pay_cycle,
            "currency": row.currency,
            "calculation_version": row.calculation_version,
            "status": row.status,
            "approved_by": row.approved_by,
            "approved_at": row.approved_at,
            "paid_at": row.paid_at,
            "locked_at": row.locked_at,
            "version": row.version,
            "correction_of_run_id": row.correction_of_run_id,
            "total_gross": float(row.total_gross),
            "total_deductions": float(row.total_deductions),
            "total_net": float(row.total_net),
            "employee_count": len(row.details),
        }
        for row in runs
    ]
