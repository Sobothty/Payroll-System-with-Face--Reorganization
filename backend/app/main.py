from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import Base, SessionLocal, engine, get_env_value
from app.models import Employee, User
from app.face.recognition import prime_recognition_models
from app.routers import attendance, auth, employees, face, kiosk, leave, payroll, payslips, reports, self_service, settings, telegram
from app.schema import bootstrap_phase2a_schema
from app.security import hash_password
from app.services.leave_service import ensure_leave_balance
from app.services.organization_service import ensure_default_org_structure, ensure_employee_org_defaults
from app.services.payroll_service import ensure_default_cambodia_tax_brackets, ensure_default_payroll_component_types
from app.services.settings_service import get_settings


app = FastAPI(title="PulseLedger Payroll Management System", version="1.0.0")


def get_allowed_origins() -> list[str]:
    configured = get_env_value("CORS_ALLOW_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
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
    admin_username = get_env_value("ADMIN_USERNAME", "admin")
    admin_password = get_env_value("ADMIN_PASSWORD", "admin123")
    db = SessionLocal()
    try:
        get_settings(db)
        ensure_default_org_structure(db)
        ensure_default_payroll_component_types(db)
        ensure_default_cambodia_tax_brackets(db)
        employees = db.query(Employee).all()
        for employee in employees:
            ensure_employee_org_defaults(db, employee)
            ensure_leave_balance(db, employee)
        admin = db.query(User).filter(User.username == admin_username).first()
        if not admin:
            admin = User(
                username=admin_username,
                hashed_password=hash_password(admin_password),
                role="admin",
                must_change_password=False,
                is_locked=False,
            )
            db.add(admin)
        db.commit()
        prime_recognition_models()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "PulseLedger API is running"}
