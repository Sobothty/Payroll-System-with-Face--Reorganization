from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session
from weasyprint import HTML

from app.models import AttendanceLog, AuditLog, LeaveRequest, PayrollDetail, PayrollRun


EXPORT_DIR = Path(__file__).resolve().parents[2] / "generated" / "reports"


def build_report_rows(db: Session, report_type: str) -> list[dict]:
    if report_type == "attendance":
        rows = db.query(AttendanceLog).all()
        return [
            {
                "employee_id": row.employee_id,
                "date": row.date,
                "check_in": row.check_in,
                "check_out": row.check_out,
                "hours_worked": row.hours_worked,
                "overtime_hours": row.overtime_hours,
            }
            for row in rows
        ]
    if report_type == "payroll":
        rows = db.query(PayrollDetail, PayrollRun).join(PayrollRun, PayrollRun.id == PayrollDetail.payroll_run_id).all()
        return [
            {
                "employee_id": detail.employee_id,
                "period_start": payroll_run.period_start,
                "period_end": payroll_run.period_end,
                "gross_pay": float(detail.gross_pay),
                "net_pay": float(detail.net_pay),
            }
            for detail, payroll_run in rows
        ]
    if report_type == "overtime":
        rows = db.query(AttendanceLog).filter(AttendanceLog.overtime_hours > 0).all()
        return [
            {
                "employee_id": row.employee_id,
                "date": row.date,
                "overtime_hours": row.overtime_hours,
                "hours_worked": row.hours_worked,
            }
            for row in rows
        ]
    if report_type == "leave":
        rows = db.query(LeaveRequest).all()
        return [
            {
                "employee_id": row.employee_id,
                "leave_type": row.leave_type,
                "start_date": row.start_date,
                "end_date": row.end_date,
                "status": row.status,
            }
            for row in rows
        ]
    rows = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [
        {
            "action": row.action,
            "table_name": row.table_name,
            "record_id": row.record_id,
            "timestamp": row.timestamp,
        }
        for row in rows
    ]


def export_excel(report_type: str, rows: list[dict]) -> str:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = EXPORT_DIR / f"{report_type}.xlsx"
    pd.DataFrame(rows).to_excel(path, index=False, engine="openpyxl")
    return str(path)


def export_pdf(report_type: str, rows: list[dict]) -> str:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = EXPORT_DIR / f"{report_type}.pdf"
    headers = rows[0].keys() if rows else []
    body = "".join(
        "<tr>" + "".join(f"<td style='padding:8px;border:1px solid #ccc'>{value}</td>" for value in row.values()) + "</tr>"
        for row in rows
    )
    html = f"""
    <html>
      <body style="font-family: sans-serif; padding: 24px;">
        <h1 style="margin-bottom: 16px; text-transform: capitalize;">{report_type} report</h1>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>{''.join(f"<th style='padding:8px;border:1px solid #ccc'>{header}</th>" for header in headers)}</tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </body>
    </html>
    """
    HTML(string=html).write_pdf(path)
    return str(path)
