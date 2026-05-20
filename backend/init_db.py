from app.config import Base, SessionLocal, engine, get_env_value
from app.models import Employee, User
from app.schema import bootstrap_phase2a_schema
from app.security import hash_password
from app.services.leave_service import ensure_leave_balance
from app.services.organization_service import ensure_default_org_structure, ensure_employee_org_defaults
from app.services.payroll_service import ensure_default_payroll_component_types
from app.services.settings_service import get_settings


def main() -> None:
    bootstrap_phase2a_schema(engine)
    Base.metadata.create_all(bind=engine)
    admin_username = get_env_value("ADMIN_USERNAME")
    admin_password = get_env_value("ADMIN_PASSWORD")
    db = SessionLocal()
    try:
        get_settings(db)
        ensure_default_org_structure(db)
        ensure_default_payroll_component_types(db)
        employees = db.query(Employee).all()
        for employee in employees:
            ensure_employee_org_defaults(db, employee)
            ensure_leave_balance(db, employee)
        admin = db.query(User).filter(User.username == admin_username).first()
        if not admin:
            db.add(User(username=admin_username, hashed_password=hash_password(admin_password), role="admin"))
            db.commit()
    finally:
        db.close()
    print("Database initialized successfully.")


if __name__ == "__main__":
    main()
