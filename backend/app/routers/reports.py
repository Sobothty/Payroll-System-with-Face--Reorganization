from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.security import require_role
from app.services.report_service import build_report_rows, export_excel, export_pdf


router = APIRouter(prefix="/api/reports", tags=["reports"])


def _report_endpoint(report_type: str, db: Session):
    return {"items": build_report_rows(db, report_type)}


@router.get("/attendance")
def attendance_report(db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    return _report_endpoint("attendance", db)


@router.get("/payroll")
def payroll_report(db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    return _report_endpoint("payroll", db)


@router.get("/overtime")
def overtime_report(db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    return _report_endpoint("overtime", db)


@router.get("/leave")
def leave_report(db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    return _report_endpoint("leave", db)


@router.get("/audit")
def audit_report(db: Session = Depends(get_db), _: object = Depends(require_role("admin"))):
    return _report_endpoint("audit", db)


@router.get("/export")
def export_report(
    report_type: str = Query(pattern="^(attendance|payroll|overtime|leave|audit)$"),
    format: str = Query(pattern="^(xlsx|pdf)$"),
    db: Session = Depends(get_db),
    _: object = Depends(require_role("admin")),
):
    rows = build_report_rows(db, report_type)
    path = export_excel(report_type, rows) if format == "xlsx" else export_pdf(report_type, rows)
    return FileResponse(path, filename=path.split("/")[-1])
