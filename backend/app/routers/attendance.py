from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AttendanceLog
from app.schemas import AttendanceCorrectionRequestCreate, AttendanceUpdate
from app.security import get_current_user
from app.services.attendance_correction_service import create_correction_request, list_correction_requests
from app.services.attendance_service import attendance_summary


router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("")
def list_attendance(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(AttendanceLog)
    if current_user.role != "admin":
        query = query.filter(AttendanceLog.employee_id == current_user.employee_id)
    rows = query.order_by(AttendanceLog.date.desc(), AttendanceLog.created_at.desc()).all()
    return [
        {
            "id": row.id,
            "employee_id": row.employee_id,
            "check_in": row.check_in,
            "check_out": row.check_out,
            "hours_worked": row.hours_worked,
            "late_minutes": row.late_minutes,
            "overtime_hours": row.overtime_hours,
            "date": row.date,
        }
        for row in rows
    ]


@router.patch("/{attendance_id}")
def update_attendance(attendance_id: int, payload: AttendanceUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        return {"status": "forbidden"}
    record = db.query(AttendanceLog).filter(AttendanceLog.id == attendance_id).first()
    if not record:
        return {"status": "not_found"}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    if record.check_in and record.check_out:
        total_hours = round((record.check_out - record.check_in).total_seconds() / 3600, 2)
        record.hours_worked = total_hours
        record.overtime_hours = round(max(0, total_hours - 8), 2)
    db.commit()
    db.refresh(record)
    return {"status": "success", "record": {"id": record.id, "hours_worked": record.hours_worked}}


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "admin":
      return {"present_today": 0, "recent_activity": [], "daily_attendance": []}
    return attendance_summary(db)


@router.get("/corrections")
def corrections(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.employee_id:
        return []
    rows = list_correction_requests(db, employee_id=current_user.employee_id)
    return [
        {
            "id": row.id,
            "employee_id": row.employee_id,
            "attendance_log_id": row.attendance_log_id,
            "requested_date": row.requested_date,
            "issue_type": row.issue_type,
            "requested_check_in": row.requested_check_in,
            "requested_check_out": row.requested_check_out,
            "reason": row.reason,
            "status": row.status,
            "reviewer": row.reviewer,
            "review_note": row.review_note,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/corrections")
def create_correction(payload: AttendanceCorrectionRequestCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.employee_id:
        return {"status": "forbidden"}
    row = create_correction_request(db, employee_id=current_user.employee_id, payload=payload, actor=current_user)
    return {
        "id": row.id,
        "status": row.status,
        "requested_date": row.requested_date,
    }
