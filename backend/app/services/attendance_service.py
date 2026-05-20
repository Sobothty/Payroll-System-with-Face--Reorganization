import json
from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import AttendanceLog, AuditLog, Employee, User
from app.services.audit_service import record_audit
from app.services.notification_service import create_notification
from app.services.organization_service import ensure_employee_org_defaults, get_active_shift_assignment


def _format_attendance_date(value: date) -> str:
    return value.strftime("%d %b %Y")


def _format_attendance_time(value: datetime | None) -> str:
    if value is None:
        return "--"
    return value.strftime("%I:%M %p")


def _format_worked_duration(hours: float | None) -> str:
    if not hours:
        return "0h 0m"

    total_minutes = max(0, round(hours * 60))
    whole_hours, minutes = divmod(total_minutes, 60)
    return f"{whole_hours}h {minutes}m"


def _resolve_schedule_window(record_date: date, assignment) -> tuple[datetime, datetime]:
    shift = assignment.shift
    scheduled_start = datetime.combine(record_date, shift.start_time)
    scheduled_end = datetime.combine(record_date, shift.end_time)
    if shift.crosses_midnight or scheduled_end <= scheduled_start:
        scheduled_end += timedelta(days=1)
    return scheduled_start, scheduled_end


def _build_check_in_message(*, employee: Employee, record: AttendanceLog) -> tuple[str, str]:
    status_text = "On Time" if not record.late_minutes else f"Late by {round(record.late_minutes):.0f} min"
    title = "✅ Attendance Check-In Recorded"
    message = (
        f"Hello {employee.full_name},\n\n"
        "Your attendance has been successfully recorded.\n\n"
        "Employee Information\n"
        f"Employee ID: {employee.employee_code}\n"
        f"Department: {employee.department}\n"
        f"Position: {employee.position}\n\n"
        "Attendance Details\n"
        f"Date: {_format_attendance_date(record.date)}\n"
        f"Check-In Time: {_format_attendance_time(record.check_in)}\n"
        f"Status: {status_text}"
    )
    return title, message


def _build_check_out_message(*, employee: Employee, record: AttendanceLog) -> tuple[str, str]:
    title = "✅ Attendance Check-Out Recorded"
    message = (
        f"Hello {employee.full_name},\n\n"
        "Your check-out has been successfully recorded.\n\n"
        "Employee Information\n"
        f"Employee ID: {employee.employee_code}\n"
        f"Department: {employee.department}\n"
        f"Position: {employee.position}\n\n"
        "Attendance Details\n"
        f"Date: {_format_attendance_date(record.date)}\n"
        f"Check-In: {_format_attendance_time(record.check_in)}\n"
        f"Check-Out: {_format_attendance_time(record.check_out)}\n"
        f"Total Worked: {_format_worked_duration(record.hours_worked)}"
    )
    return title, message


def log_attendance(db: Session, employee: Employee, confidence: float, actor: User | None = None) -> tuple[str, AttendanceLog]:
    today = date.today()
    now = datetime.now()
    assignment = get_active_shift_assignment(db, employee_id=employee.id, as_of=today)
    if assignment is None:
        assignment = ensure_employee_org_defaults(db, employee)

    scheduled_start, scheduled_end = _resolve_schedule_window(today, assignment)
    policy = assignment.attendance_policy
    existing = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.employee_id == employee.id,
            AttendanceLog.date == today,
            AttendanceLog.check_out.is_(None),
        )
        .first()
    )

    if not existing:
        raw_late = max(0, round((now - scheduled_start).total_seconds() / 60, 2)) if now > scheduled_start else 0
        late_minutes = max(0, round(raw_late - float(policy.late_grace_minutes), 2))
        attendance_status = "late" if late_minutes > 0 else "present"
        record = AttendanceLog(
            employee_id=employee.id,
            shift_assignment_id=assignment.id,
            check_in=now,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            date=today,
            late_minutes=late_minutes,
            early_leave_minutes=0,
            overtime_hours=0,
            attendance_status=attendance_status,
            source_status="system",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        action = "check_in"
    else:
        hours = round((now - existing.check_in).total_seconds() / 3600, 2)
        raw_early_leave = max(0, round((scheduled_end - now).total_seconds() / 60, 2)) if now < scheduled_end else 0
        early_leave_minutes = max(0, round(raw_early_leave - float(policy.early_leave_grace_minutes), 2))
        overtime_hours = round(max(0, hours - float(assignment.shift.standard_hours)), 2)
        if overtime_hours > 0 and policy.overtime_minimum_minutes:
            overtime_threshold_hours = float(policy.overtime_minimum_minutes) / 60
            if overtime_hours < overtime_threshold_hours:
                overtime_hours = 0

        existing.check_out = now
        existing.hours_worked = hours
        existing.scheduled_start = existing.scheduled_start or scheduled_start
        existing.scheduled_end = existing.scheduled_end or scheduled_end
        existing.shift_assignment_id = existing.shift_assignment_id or assignment.id
        existing.early_leave_minutes = early_leave_minutes
        existing.overtime_hours = overtime_hours
        if existing.late_minutes > 0:
            existing.attendance_status = "late"
        elif early_leave_minutes > 0:
            existing.attendance_status = "early_leave"
        else:
            existing.attendance_status = "present"
        db.commit()
        db.refresh(existing)
        record = existing
        action = "check_out"

    record_audit(
        db,
        action=f"attendance.{action}",
        table_name="attendance_logs",
        record_id=str(record.id),
        new_value={
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "department": employee.department,
            "action": action,
            "confidence": confidence,
            "time": now.strftime("%H:%M:%S"),
        },
        actor=actor,
    )
    if action == "check_in":
        title, message = _build_check_in_message(employee=employee, record=record)
        create_notification(
            db,
            employee_id=employee.id,
            title=title,
            message=message,
            category="attendance",
        )
    else:
        title, message = _build_check_out_message(employee=employee, record=record)
        create_notification(
            db,
            employee_id=employee.id,
            title=title,
            message=message,
            category="attendance",
        )
    db.commit()
    return action, record


def record_denied_scan(db: Session) -> None:
    record_audit(
        db,
        action="attendance.denied",
        table_name="attendance_logs",
        record_id="denied",
        new_value={"employee_name": "Unknown", "department": "-", "action": "denied", "time": datetime.now().strftime("%H:%M:%S")},
        actor=None,
    )


def get_recent_activity(db: Session, limit: int = 8) -> list[dict]:
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.table_name == "attendance_logs")
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    items: list[dict] = []
    for row in rows:
        payload = json.loads(row.new_value) if row.new_value else {}
        name = payload.get("employee_name", "Unknown")
        items.append(
            {
                "name": name,
                "initials": "".join(part[0] for part in name.split()[:2]).upper() if name else "UN",
                "department": payload.get("department", "-"),
                "action": payload.get("action", "denied"),
                "time": payload.get("time", row.timestamp.strftime("%H:%M:%S")),
                "confidence": payload.get("confidence"),
            }
        )
    return items


def attendance_summary(db: Session) -> dict:
    today = date.today()
    present_today = db.query(AttendanceLog).filter(AttendanceLog.date == today).count()
    recent = get_recent_activity(db, limit=10)
    week_start = today - timedelta(days=6)
    this_week_rows = (
        db.query(AttendanceLog.date)
        .filter(AttendanceLog.date >= week_start, AttendanceLog.date <= today)
        .all()
    )
    weekday_counts = Counter(row.date.strftime("%a") for row in this_week_rows)
    return {
        "present_today": present_today,
        "recent_activity": recent,
        "daily_attendance": [{"weekday": weekday, "count": count} for weekday, count in sorted(weekday_counts.items())],
    }
