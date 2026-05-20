from datetime import date, time

from sqlalchemy.orm import Session, joinedload

from app.models import AttendancePolicy, Branch, Employee, EmployeeShiftAssignment, LegalEntity, WorkShift
from app.services.settings_service import get_settings


DEFAULT_LEGAL_ENTITY_CODE = "DEFAULT"
DEFAULT_BRANCH_CODE = "HEAD_OFFICE"
DEFAULT_SHIFT_CODE = "STANDARD_DAY"
DEFAULT_POLICY_CODE = "STANDARD_POLICY"


def ensure_default_org_structure(db: Session) -> dict[str, object]:
    settings = get_settings(db)

    legal_entity = db.query(LegalEntity).filter(LegalEntity.code == DEFAULT_LEGAL_ENTITY_CODE).first()
    if legal_entity is None:
        legal_entity = LegalEntity(
            code=DEFAULT_LEGAL_ENTITY_CODE,
            name=settings.company_name,
            currency=settings.currency,
            timezone="Asia/Phnom_Penh",
            country_code="KH",
        )
        db.add(legal_entity)
        db.flush()

    branch = (
        db.query(Branch)
        .filter(Branch.legal_entity_id == legal_entity.id, Branch.code == DEFAULT_BRANCH_CODE)
        .first()
    )
    if branch is None:
        branch = Branch(
            legal_entity_id=legal_entity.id,
            code=DEFAULT_BRANCH_CODE,
            name="Head Office",
            address=settings.address,
            timezone=legal_entity.timezone,
        )
        db.add(branch)
        db.flush()

    shift = (
        db.query(WorkShift)
        .filter(WorkShift.legal_entity_id == legal_entity.id, WorkShift.code == DEFAULT_SHIFT_CODE)
        .first()
    )
    if shift is None:
        shift = WorkShift(
            legal_entity_id=legal_entity.id,
            code=DEFAULT_SHIFT_CODE,
            name="Standard Day Shift",
            start_time=time(hour=9, minute=0),
            end_time=time(hour=17, minute=0),
            break_minutes=60,
            standard_hours=float(settings.hours_per_day),
            crosses_midnight=False,
        )
        db.add(shift)
        db.flush()

    policy = (
        db.query(AttendancePolicy)
        .filter(AttendancePolicy.legal_entity_id == legal_entity.id, AttendancePolicy.code == DEFAULT_POLICY_CODE)
        .first()
    )
    if policy is None:
        policy = AttendancePolicy(
            legal_entity_id=legal_entity.id,
            code=DEFAULT_POLICY_CODE,
            name="Standard Attendance Policy",
            late_grace_minutes=0,
            early_leave_grace_minutes=0,
            overtime_minimum_minutes=0,
            rounding_minutes=0,
            requires_check_out=True,
        )
        db.add(policy)
        db.flush()

    return {
        "legal_entity": legal_entity,
        "branch": branch,
        "shift": shift,
        "policy": policy,
    }


def get_active_shift_assignment(db: Session, *, employee_id: str, as_of: date) -> EmployeeShiftAssignment | None:
    return (
        db.query(EmployeeShiftAssignment)
        .options(
            joinedload(EmployeeShiftAssignment.shift),
            joinedload(EmployeeShiftAssignment.attendance_policy),
        )
        .filter(
            EmployeeShiftAssignment.employee_id == employee_id,
            EmployeeShiftAssignment.effective_from <= as_of,
            (EmployeeShiftAssignment.effective_to.is_(None) | (EmployeeShiftAssignment.effective_to >= as_of)),
        )
        .order_by(EmployeeShiftAssignment.effective_from.desc(), EmployeeShiftAssignment.created_at.desc())
        .first()
    )


def ensure_employee_org_defaults(db: Session, employee: Employee) -> EmployeeShiftAssignment:
    defaults = ensure_default_org_structure(db)
    changed = False

    if not employee.legal_entity_id:
        employee.legal_entity_id = defaults["legal_entity"].id
        changed = True
    if not employee.branch_id:
        employee.branch_id = defaults["branch"].id
        changed = True
    if not employee.employment_type:
        employee.employment_type = "permanent"
        changed = True

    if changed:
        db.flush()

    assignment = get_active_shift_assignment(db, employee_id=employee.id, as_of=date.today())
    if assignment is not None:
        return assignment

    assignment = EmployeeShiftAssignment(
        employee_id=employee.id,
        shift_id=defaults["shift"].id,
        attendance_policy_id=defaults["policy"].id,
        effective_from=employee.hire_date or date.today(),
    )
    db.add(assignment)
    db.flush()

    return get_active_shift_assignment(db, employee_id=employee.id, as_of=date.today()) or assignment
