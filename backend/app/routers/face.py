from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.face.recognition import FACES_DIR, recognize_face, register_employee_face
from app.schemas import FaceRegistrationRequest
from app.security import require_role
from app.services.attendance_service import log_attendance
from app.services.employee_service import get_employee_or_404


router = APIRouter(prefix="/api/face", tags=["face"])


@router.post("/register")
def register_face(payload: FaceRegistrationRequest, _: object = Depends(require_role("admin")), db: Session = Depends(get_db)):
    employee = get_employee_or_404(db, payload.employee_id)
    saved = register_employee_face(payload.employee_id, payload.frames)
    employee.face_folder_path = str(Path(FACES_DIR) / payload.employee_id)
    db.commit()
    return {"status": "success", "frames_saved": saved, "face_folder_path": employee.face_folder_path}


@router.post("/scan")
async def scan_face(image: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(image.filename or "scan.jpg").suffix or ".jpg"
    with NamedTemporaryFile(delete=False, suffix=suffix) as temp:
        temp.write(await image.read())
        temp_path = temp.name
    result = recognize_face(temp_path)
    if result["status"] != "success":
        return result
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
