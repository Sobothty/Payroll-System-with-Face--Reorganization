from datetime import date, datetime, timedelta
from decimal import Decimal

from app.config import Base, SessionLocal, engine, get_env_value
from app.models import AttendanceLog, Employee, EmployeeCompensationHistory, EmployeePayrollComponent, PayrollComponentType, User
from app.schema import bootstrap_phase2a_schema
from app.security import hash_password
from app.services.leave_service import ensure_leave_balance
from app.services.organization_service import ensure_default_org_structure, ensure_employee_org_defaults
from app.services.payroll_service import ensure_default_cambodia_tax_brackets, ensure_default_payroll_component_types
from app.services.settings_service import get_settings

SEED_PERIOD_START = date(2026, 4, 1)
SEED_PERIOD_END = date(2026, 4, 30)
SEED_PASSWORD = "password123"
SEED_BONUS_NOTE = "Seed bonus for payroll testing"
SEED_EMPLOYEES = [
    {
        "id": "seed-employee-001",
        "username": "employee01",
        "full_name": "Sok Dara",
        "employee_code": "EMP001",
        "department": "Operations",
        "position": "Operations Lead",
        "pay_type": "monthly",
        "base_salary": Decimal("950.00"),
        "hire_date": date(2025, 8, 12),
        "email": "employee01@pulseledger.local",
        "phone": "010-000-001",
        "bonus": Decimal("180.00"),
    },
    {
        "id": "seed-employee-002",
        "username": "employee02",
        "full_name": "Sreyneang Lim",
        "employee_code": "EMP002",
        "department": "Operations",
        "position": "Attendance Coordinator",
        "pay_type": "monthly",
        "base_salary": Decimal("780.00"),
        "hire_date": date(2025, 9, 3),
        "email": "employee02@pulseledger.local",
        "phone": "010-000-002",
        "bonus": Decimal("0.00"),
    },
    {
        "id": "seed-employee-003",
        "username": "employee03",
        "full_name": "Vannak Chhorn",
        "employee_code": "EMP003",
        "department": "Engineering",
        "position": "Software Engineer",
        "pay_type": "monthly",
        "base_salary": Decimal("1250.00"),
        "hire_date": date(2025, 7, 21),
        "email": "employee03@pulseledger.local",
        "phone": "010-000-003",
        "bonus": Decimal("250.00"),
    },
    {
        "id": "seed-employee-004",
        "username": "employee04",
        "full_name": "Piseth Ngin",
        "employee_code": "EMP004",
        "department": "Engineering",
        "position": "QA Analyst",
        "pay_type": "monthly",
        "base_salary": Decimal("890.00"),
        "hire_date": date(2025, 10, 14),
        "email": "employee04@pulseledger.local",
        "phone": "010-000-004",
        "bonus": Decimal("0.00"),
    },
    {
        "id": "seed-employee-005",
        "username": "employee05",
        "full_name": "Chanrith Mey",
        "employee_code": "EMP005",
        "department": "Finance",
        "position": "Payroll Officer",
        "pay_type": "monthly",
        "base_salary": Decimal("1100.00"),
        "hire_date": date(2025, 6, 9),
        "email": "employee05@pulseledger.local",
        "phone": "010-000-005",
        "bonus": Decimal("120.00"),
    },
    {
        "id": "seed-employee-006",
        "username": "employee06",
        "full_name": "Ratha Prak",
        "employee_code": "EMP006",
        "department": "Finance",
        "position": "Accountant",
        "pay_type": "monthly",
        "base_salary": Decimal("860.00"),
        "hire_date": date(2025, 11, 5),
        "email": "employee06@pulseledger.local",
        "phone": "010-000-006",
        "bonus": Decimal("0.00"),
    },
    {
        "id": "seed-employee-007",
        "username": "employee07",
        "full_name": "Kimsan Hor",
        "employee_code": "EMP007",
        "department": "HR",
        "position": "HR Generalist",
        "pay_type": "monthly",
        "base_salary": Decimal("820.00"),
        "hire_date": date(2025, 8, 28),
        "email": "employee07@pulseledger.local",
        "phone": "010-000-007",
        "bonus": Decimal("0.00"),
    },
    {
        "id": "seed-employee-008",
        "username": "employee08",
        "full_name": "Bopha Srun",
        "employee_code": "EMP008",
        "department": "HR",
        "position": "Recruitment Specialist",
        "pay_type": "monthly",
        "base_salary": Decimal("790.00"),
        "hire_date": date(2025, 12, 1),
        "email": "employee08@pulseledger.local",
        "phone": "010-000-008",
        "bonus": Decimal("75.00"),
    },
    {
        "id": "seed-employee-009",
        "username": "employee09",
        "full_name": "Mony Tep",
        "employee_code": "EMP009",
        "department": "Operations",
        "position": "Branch Supervisor",
        "pay_type": "monthly",
        "base_salary": Decimal("980.00"),
        "hire_date": date(2025, 7, 4),
        "email": "employee09@pulseledger.local",
        "phone": "010-000-009",
        "bonus": Decimal("0.00"),
    },
    {
        "id": "seed-employee-010",
        "username": "employee10",
        "full_name": "Savuth Keo",
        "employee_code": "EMP010",
        "department": "Engineering",
        "position": "DevOps Engineer",
        "pay_type": "monthly",
        "base_salary": Decimal("1320.00"),
        "hire_date": date(2025, 5, 19),
        "email": "employee10@pulseledger.local",
        "phone": "010-000-010",
        "bonus": Decimal("210.00"),
    },
]


def upsert_seed_employee(db, *, employee_seed: dict, default_password_hash: str) -> Employee:
    employee = db.query(Employee).filter(Employee.id == employee_seed["id"]).first()
    if employee is None:
        employee = db.query(Employee).filter(Employee.employee_code == employee_seed["employee_code"]).first()
    if employee is None:
        employee = Employee(id=employee_seed["id"])
        db.add(employee)

    employee.full_name = employee_seed["full_name"]
    employee.employee_code = employee_seed["employee_code"]
    employee.department = employee_seed["department"]
    employee.position = employee_seed["position"]
    employee.pay_type = employee_seed["pay_type"]
    employee.base_salary = employee_seed["base_salary"]
    employee.hire_date = employee_seed["hire_date"]
    employee.email = employee_seed["email"]
    employee.phone = employee_seed["phone"]
    employee.status = "active"
    employee.initial_password = SEED_PASSWORD
    employee.face_folder_path = employee.face_folder_path or f"seed-faces/{employee.id}"
    db.flush()

    assignment = ensure_employee_org_defaults(db, employee)
    ensure_leave_balance(db, employee)

    compensation = (
        db.query(EmployeeCompensationHistory)
        .filter(
            EmployeeCompensationHistory.employee_id == employee.id,
            EmployeeCompensationHistory.effective_from == employee_seed["hire_date"],
        )
        .first()
    )
    if compensation is None:
        compensation = EmployeeCompensationHistory(
            employee_id=employee.id,
            effective_from=employee_seed["hire_date"],
        )
        db.add(compensation)
    compensation.pay_type = employee_seed["pay_type"]
    compensation.base_salary = employee_seed["base_salary"]
    compensation.reason = "Seed opening salary"

    user = db.query(User).filter(User.username == employee_seed["username"]).first()
    if user is None:
        user = db.query(User).filter(User.employee_id == employee.id).first()
    if user is None:
        user = User(username=employee_seed["username"])
        db.add(user)
    user.employee_id = employee.id
    user.hashed_password = default_password_hash
    user.role = "employee"
    user.must_change_password = False
    user.is_locked = False

    return assignment


def seed_attendance(db, *, employee_id: str, shift_assignment) -> None:
    db.query(AttendanceLog).filter(
        AttendanceLog.employee_id == employee_id,
        AttendanceLog.date >= SEED_PERIOD_START,
        AttendanceLog.date <= SEED_PERIOD_END,
    ).delete(synchronize_session=False)

    current_day = SEED_PERIOD_START
    while current_day <= SEED_PERIOD_END:
        if current_day.weekday() < 5:
            shift = shift_assignment.shift
            check_in = datetime.combine(current_day, shift.start_time)
            check_out = datetime.combine(current_day, shift.end_time)
            scheduled_start = check_in
            scheduled_end = check_out

            db.add(
                AttendanceLog(
                    employee_id=employee_id,
                    shift_assignment_id=shift_assignment.id,
                    check_in=check_in,
                    check_out=check_out,
                    scheduled_start=scheduled_start,
                    scheduled_end=scheduled_end,
                    hours_worked=float(shift.standard_hours),
                    late_minutes=0,
                    early_leave_minutes=0,
                    overtime_hours=0,
                    attendance_status="present",
                    source_status="system",
                    date=current_day,
                )
            )
        current_day += timedelta(days=1)


def seed_bonus_component(db, *, employee_id: str, amount: Decimal, bonus_component_type_id: int) -> None:
    existing = (
        db.query(EmployeePayrollComponent)
        .filter(
            EmployeePayrollComponent.employee_id == employee_id,
            EmployeePayrollComponent.component_type_id == bonus_component_type_id,
            EmployeePayrollComponent.notes == SEED_BONUS_NOTE,
        )
        .first()
    )

    if amount <= 0:
        if existing is not None:
            db.delete(existing)
        return

    if existing is None:
        existing = EmployeePayrollComponent(
            employee_id=employee_id,
            component_type_id=bonus_component_type_id,
            notes=SEED_BONUS_NOTE,
        )
        db.add(existing)

    existing.amount = amount
    existing.quantity = None
    existing.recurrence = "monthly"
    existing.effective_from = SEED_PERIOD_START
    existing.effective_to = None
    existing.is_active = True


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
        ensure_default_cambodia_tax_brackets(db)
        default_password_hash = hash_password(SEED_PASSWORD)
        bonus_component_type = db.query(PayrollComponentType).filter(PayrollComponentType.code == "bonus").first()

        if bonus_component_type is None:
            raise RuntimeError("Bonus payroll component type is missing after default payroll setup.")

        for employee_seed in SEED_EMPLOYEES:
            assignment = upsert_seed_employee(db, employee_seed=employee_seed, default_password_hash=default_password_hash)
            seed_attendance(db, employee_id=assignment.employee_id, shift_assignment=assignment)
            seed_bonus_component(
                db,
                employee_id=assignment.employee_id,
                amount=employee_seed["bonus"],
                bonus_component_type_id=bonus_component_type.id,
            )

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
    print(
        "Database initialized successfully with"
        f" {len(SEED_EMPLOYEES)} seeded employees, weekday attendance from {SEED_PERIOD_START} to {SEED_PERIOD_END},"
        " and payroll bonus data for selected staff."
    )


if __name__ == "__main__":
    main()
