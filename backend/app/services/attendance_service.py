import json
from datetime import date, datetime, time

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AttendanceLog, AuditLog, Employee, User
from app.services.audit_service import record_audit
from app.services.notification_service import create_notification


def log_attendance(db: Session, employee: Employee, confidence: float, actor: User | None = None) -> tuple[str, AttendanceLog]:
    today = date.today()
    now = datetime.now()
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
        standard_start = datetime.combine(today, time(hour=9, minute=0))
        late_minutes = max(0, round((now - standard_start).total_seconds() / 60, 2)) if now > standard_start else 0
        record = AttendanceLog(
            employee_id=employee.id,
            check_in=now,
            date=today,
            late_minutes=late_minutes,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        action = "check_in"
    else:
        hours = round((now - existing.check_in).total_seconds() / 3600, 2)
        existing.check_out = now
        existing.hours_worked = hours
        existing.overtime_hours = round(max(0, hours - 8), 2)
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
        create_notification(
            db,
            employee_id=employee.id,
            title="Attendance check-in recorded",
            message=(
                f"You checked in at {record.check_in.strftime('%H:%M:%S')} on {record.date.isoformat()}."
                + (f" Late by {record.late_minutes:.0f} minutes." if record.late_minutes else " You are on time.")
            ),
            category="attendance",
        )
    else:
        create_notification(
            db,
            employee_id=employee.id,
            title="Attendance check-out recorded",
            message=(
                f"You checked out at {record.check_out.strftime('%H:%M:%S')} on {record.date.isoformat()}."
                f" Hours worked: {record.hours_worked:.2f}."
                + (f" Overtime: {record.overtime_hours:.2f} hours." if record.overtime_hours else "")
            ),
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
    this_week = (
        db.query(func.strftime("%w", AttendanceLog.date).label("weekday"), func.count(AttendanceLog.id))
        .group_by("weekday")
        .all()
    )
    return {
        "present_today": present_today,
        "recent_activity": recent,
        "daily_attendance": [{"weekday": row[0], "count": row[1]} for row in this_week],
    }
