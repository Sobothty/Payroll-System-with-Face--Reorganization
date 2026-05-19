from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.face.recognition import recognize_face
from app.services.attendance_service import get_recent_activity, log_attendance, record_denied_scan
from app.services.employee_service import get_employee_or_404
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
    result = recognize_face(temp_path)
    if result["status"] == "success":
        employee = get_employee_or_404(db, result["employee_id"])
        action, record = log_attendance(db, employee, result["confidence"])
        return {
            "status": "success",
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "department": employee.department,
            "action": action,
            "time": (record.check_out or record.check_in).strftime("%H:%M:%S"),
            "confidence": result["confidence"],
        }
    if result["status"] == "unknown":
        record_denied_scan(db)
        return {"status": "unknown"}
    return JSONResponse({"status": "error", "message": result.get("message", "Unknown error")}, status_code=500)


@router.get("/kiosk/activity")
def kiosk_activity(db: Session = Depends(get_db)):
    return get_recent_activity(db, limit=8)
