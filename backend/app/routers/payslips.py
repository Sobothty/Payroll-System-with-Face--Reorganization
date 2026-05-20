from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.config.database import get_db
from app.models import PayrollDetail, User
from app.security import get_current_user, require_role


router = APIRouter(prefix="/api/payslips", tags=["payslips"])


def _serialize(detail: PayrollDetail) -> dict:
    run = detail.payroll_run
    employee = detail.employee
    return {
        "id": detail.id,
        "employee_id": detail.employee_id,
        "employee_name": employee.full_name,
        "period_start": run.period_start,
        "period_end": run.period_end,
        "net_pay": detail.net_pay,
        "status": run.status,
        "payslip_path": detail.payslip_path,
    }


@router.get("")
def list_payslips(
    employee_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PayrollDetail).options(joinedload(PayrollDetail.payroll_run), joinedload(PayrollDetail.employee))
    if current_user.role != "admin":
        employee_id = current_user.employee_id
    if employee_id:
        query = query.filter(PayrollDetail.employee_id == employee_id)
    rows = query.order_by(PayrollDetail.id.desc()).all()
    return [_serialize(row) for row in rows]


@router.get("/{detail_id}/download")
def download_payslip(detail_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    detail = (
        db.query(PayrollDetail)
        .options(joinedload(PayrollDetail.payroll_run), joinedload(PayrollDetail.employee))
        .filter(PayrollDetail.id == detail_id)
        .first()
    )
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found")
    if current_user.role != "admin" and current_user.employee_id != detail.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    path = Path(detail.payslip_path or "")
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not generated")
    return FileResponse(path, media_type="application/pdf", filename=path.name)
