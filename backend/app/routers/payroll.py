from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PayrollRun
from app.schemas import PayrollCalculateRequest, PayrollRunRequest
from app.security import require_role
from app.services.payroll_service import approve_payroll_run, calculate_payroll, run_payroll


router = APIRouter(prefix="/api/payroll", tags=["payroll"])


@router.post("/calculate")
def calculate(payload: PayrollCalculateRequest, db: Session = Depends(get_db), _: object = Depends(require_role("admin", "payroll_admin", "approver"))):
    return calculate_payroll(db, period_start=payload.period_start, period_end=payload.period_end, department=payload.department)


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
            "period_start": row.period_start,
            "period_end": row.period_end,
            "run_date": row.run_date,
            "processed_by": row.processed_by,
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
        }
        for row in runs
    ]
