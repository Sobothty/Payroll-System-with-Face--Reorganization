from datetime import date

from sqlalchemy.orm import Session

from app.models import AttendanceCorrectionRequest, AttendanceLog, LeaveRequest


def get_self_service_overview(db: Session, *, employee_id: str) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    today_log = (
        db.query(AttendanceLog)
        .filter(AttendanceLog.employee_id == employee_id, AttendanceLog.date == today)
        .order_by(AttendanceLog.created_at.desc())
        .first()
    )
    month_logs = (
        db.query(AttendanceLog)
        .filter(AttendanceLog.employee_id == employee_id, AttendanceLog.date >= month_start, AttendanceLog.date <= today)
        .all()
    )
    pending_leave_requests = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.employee_id == employee_id, LeaveRequest.status == "pending")
        .count()
    )
    pending_correction_requests = (
        db.query(AttendanceCorrectionRequest)
        .filter(AttendanceCorrectionRequest.employee_id == employee_id, AttendanceCorrectionRequest.status == "pending")
        .count()
    )
    if today_log is None:
        today_status = "not_checked_in"
    elif today_log.check_out is None:
        today_status = "checked_in"
    else:
        today_status = "checked_out"

    return {
        "today_status": today_status,
        "checked_in_at": today_log.check_in if today_log else None,
        "checked_out_at": today_log.check_out if today_log else None,
        "hours_today": round(today_log.hours_worked or 0, 2) if today_log else 0,
        "late_today": round(today_log.late_minutes or 0, 2) if today_log else 0,
        "monthly_days_worked": len(month_logs),
        "monthly_late_count": sum(1 for row in month_logs if (row.late_minutes or 0) > 0),
        "monthly_overtime_hours": round(sum(row.overtime_hours or 0 for row in month_logs), 2),
        "pending_leave_requests": pending_leave_requests,
        "pending_correction_requests": pending_correction_requests,
    }
