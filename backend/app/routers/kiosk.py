from pathlib import Path
from tempfile import NamedTemporaryFile
from os import unlink

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.face.recognition import recognize_face
from app.services.attendance_service import get_recent_activity, log_attendance, record_denied_scan
from app.services.employee_service import get_employee_or_404
from app.services.self_service_service import get_self_service_overview
from app.services.settings_service import get_settings


templates = Jinja2Templates(directory=str(Path(__file__).resolve().parents[1] / "templates"))
router = APIRouter(tags=["kiosk"])


@router.get("/kiosk")
def kiosk_page(request: Request, db: Session = Depends(get_db)):
    settings = get_settings(db)
    return templates.TemplateResponse("kiosk.html", {"request": request, "company_name": settings.company_name})


@router.post("/kiosk/scan")
async def kiosk_scan(image: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(image.filename or "scan.jpg").suffix or ".jpg"
    with NamedTemporaryFile(delete=False, suffix=suffix) as temp:
        temp.write(await image.read())
        temp_path = temp.name
    try:
        result = recognize_face(temp_path)
    finally:
        try:
            unlink(temp_path)
        except OSError:
            pass
    if result["status"] == "success":
        employee = get_employee_or_404(db, result["employee_id"])
        action, record = log_attendance(db, employee, result["confidence"])
        overview = get_self_service_overview(db, employee_id=employee.id)
        return {
            "status": "success",
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.full_name,
            "department": employee.department,
            "position": employee.position,
            "action": action,
            "time": (record.check_out or record.check_in).strftime("%H:%M:%S"),
            "confidence": result["confidence"],
            "today_status": overview["today_status"],
            "checked_in_at": record.check_in.strftime("%H:%M:%S") if record.check_in else None,
            "checked_out_at": record.check_out.strftime("%H:%M:%S") if record.check_out else None,
            "hours_today": overview["hours_today"],
            "late_today": overview["late_today"],
            "monthly_days_worked": overview["monthly_days_worked"],
            "monthly_late_count": overview["monthly_late_count"],
            "monthly_overtime_hours": overview["monthly_overtime_hours"],
        }
    if result["status"] == "unknown":
        record_denied_scan(db)
        return {"status": "unknown"}
    return JSONResponse({"status": "error", "message": result.get("message", "Unknown error")}, status_code=500)


@router.get("/kiosk/activity")
def kiosk_activity(db: Session = Depends(get_db)):
    return get_recent_activity(db, limit=8)
