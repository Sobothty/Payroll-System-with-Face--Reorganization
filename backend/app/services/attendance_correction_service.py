from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import AttendanceCorrectionRequest, AttendanceLog, User
from app.schema import AttendanceCorrectionRequestCreate
from app.services.audit_service import record_audit
from app.services.notification_service import create_notification


def create_correction_request(
    db: Session,
    *,
    employee_id: str,
    payload: AttendanceCorrectionRequestCreate,
    actor: User | None = None,
) -> AttendanceCorrectionRequest:
    if payload.attendance_log_id is not None:
        log = db.query(AttendanceLog).filter(AttendanceLog.id == payload.attendance_log_id).first()
        if not log or log.employee_id != employee_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance log not found")

    request = AttendanceCorrectionRequest(employee_id=employee_id, **payload.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    record_audit(
        db,
        action="attendance.correction.submit",
        table_name="attendance_correction_requests",
        record_id=str(request.id),
        new_value={"employee_id": employee_id, "status": request.status, "issue_type": request.issue_type},
        actor=actor,
    )
    create_notification(
        db,
        employee_id=employee_id,
        title="Attendance correction submitted",
        message=f"Your correction request for {request.requested_date} is pending review.",
        category="attendance",
    )
    db.commit()
    return request


def list_correction_requests(db: Session, *, employee_id: str) -> list[AttendanceCorrectionRequest]:
    return (
        db.query(AttendanceCorrectionRequest)
        .filter(AttendanceCorrectionRequest.employee_id == employee_id)
        .order_by(AttendanceCorrectionRequest.created_at.desc())
        .all()
    )
