from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app.models import Employee, User
from app.routers import attendance, auth, employees, face, kiosk, leave, payroll, payslips, reports, self_service, settings, telegram
from app.schema_bootstrap import bootstrap_phase2a_schema
from app.security import hash_password
from app.services.leave_service import ensure_leave_balance
from app.services.settings_service import get_settings


app = FastAPI(title="PulseLedger Payroll Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(Path(__file__).resolve().parent / "static")), name="static")

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(face.router)
app.include_router(attendance.router)
app.include_router(payroll.router)
app.include_router(payslips.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(leave.router)
app.include_router(self_service.router)
app.include_router(telegram.router)
app.include_router(kiosk.router)


@app.on_event("startup")
def startup() -> None:
    bootstrap_phase2a_schema(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        get_settings(db)
        employees = db.query(Employee).all()
        for employee in employees:
            ensure_leave_balance(db, employee)
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                role="admin",
                must_change_password=False,
                is_locked=False,
            )
            db.add(admin)
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "PulseLedger API is running"}
