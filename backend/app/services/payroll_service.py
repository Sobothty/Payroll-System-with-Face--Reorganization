from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import (
    AttendanceLog,
    Deduction,
    Employee,
    EmployeePayrollComponent,
    PayPeriod,
    PayrollComponentType,
    PayrollDetail,
    PayrollDetailLine,
    PayrollRun,
    TaxBracket,
    User,
)
from app.schema import PayrollRunRequest, TaxBracketPayload
from app.services.audit_service import record_audit
from app.services.compensation_service import resolve_compensation_for_period
from app.services.payslip_service import generate_payslip_pdf
from app.services.settings_service import get_settings
from app.services.tax_calculator import calculate_cambodia_tax


DEFAULT_COMPONENT_TYPES = [
    {"code": "base_pay", "name": "Base Pay", "category": "earning", "calculation_mode": "computed", "is_taxable": True},
    {"code": "overtime_pay", "name": "Overtime Pay", "category": "earning", "calculation_mode": "computed", "is_taxable": True},
    {"code": "bonus", "name": "Bonus", "category": "earning", "calculation_mode": "manual", "is_taxable": True},
    {"code": "allowance", "name": "Allowance", "category": "earning", "calculation_mode": "manual", "is_taxable": False},
    {"code": "loan_repayment", "name": "Loan Repayment", "category": "deduction", "calculation_mode": "fixed", "is_taxable": False},
    {"code": "other_deduction", "name": "Other Deduction", "category": "deduction", "calculation_mode": "fixed", "is_taxable": False},
    {"code": "tax", "name": "Income Tax", "category": "deduction", "calculation_mode": "computed", "is_taxable": False},
    {"code": "insurance", "name": "Insurance", "category": "deduction", "calculation_mode": "computed", "is_taxable": False},
    {"code": "pension", "name": "Pension", "category": "deduction", "calculation_mode": "computed", "is_taxable": False},
]


def _decimal(value: float | int | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _money(value: float | int | Decimal | None) -> float:
    return float(_decimal(value))


def _collect_adjustments(adjustments) -> dict[str, dict[str, Decimal]]:
    items: dict[str, dict[str, Decimal]] = defaultdict(lambda: {"bonus": Decimal("0.00"), "allowance": Decimal("0.00")})
    for row in adjustments or []:
        items[row.employee_id] = {"bonus": _decimal(row.bonus), "allowance": _decimal(row.allowance)}
    return items


def ensure_default_payroll_component_types(db: Session) -> None:
    existing = {row.code: row for row in db.query(PayrollComponentType).all()}
    created = False
    for item in DEFAULT_COMPONENT_TYPES:
        if item["code"] in existing:
            continue
        db.add(PayrollComponentType(**item))
        created = True
    if created:
        db.commit()


def ensure_default_cambodia_tax_brackets(db: Session) -> None:
    existing_count = db.query(TaxBracket).count()
    if existing_count > 0:
        return

    default_brackets = [
        TaxBracket(min_salary=Decimal("0.00"), max_salary=Decimal("1500000.00"), tax_rate=0.00, is_active=True),
        TaxBracket(min_salary=Decimal("1500000.00"), max_salary=Decimal("2000000.00"), tax_rate=0.05, is_active=True),
        TaxBracket(min_salary=Decimal("2000000.00"), max_salary=Decimal("8500000.00"), tax_rate=0.10, is_active=True),
        TaxBracket(min_salary=Decimal("8500000.00"), max_salary=Decimal("12500000.00"), tax_rate=0.15, is_active=True),
        TaxBracket(min_salary=Decimal("12500000.00"), max_salary=None, tax_rate=0.20, is_active=True),
    ]
    for bracket in default_brackets:
        db.add(bracket)
    db.commit()


def _normalize_tax_rate(rate: float | int | Decimal) -> float:
    decimal_rate = Decimal(str(rate))
    if decimal_rate > Decimal("1.00"):
        decimal_rate = decimal_rate / Decimal("100")
    return float(decimal_rate.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))


def _serialize_tax_bracket(bracket: TaxBracket) -> dict:
    return {
        "id": bracket.id,
        "min_salary": _money(bracket.min_salary),
        "max_salary": _money(bracket.max_salary) if bracket.max_salary is not None else None,
        "tax_rate": float(bracket.tax_rate),
        "tax_percent": float(Decimal(str(bracket.tax_rate)) * Decimal("100")),
        "is_active": bracket.is_active,
        "created_at": bracket.created_at,
        "updated_at": bracket.updated_at,
    }


def list_tax_brackets(db: Session) -> list[dict]:
    ensure_default_cambodia_tax_brackets(db)
    brackets = db.query(TaxBracket).order_by(TaxBracket.min_salary.asc(), TaxBracket.id.asc()).all()
    return [_serialize_tax_bracket(bracket) for bracket in brackets]


def replace_tax_brackets(db: Session, brackets: list[TaxBracketPayload]) -> list[dict]:
    if not brackets:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one tax bracket is required")

    normalized = sorted(brackets, key=lambda row: (row.min_salary, float("inf") if row.max_salary is None else row.max_salary))
    active_brackets = [row for row in normalized if row.is_active]

    if not active_brackets:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one active tax bracket is required")
    if _decimal(active_brackets[0].min_salary) != Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The first active tax bracket must start at 0 riel")

    previous_max: Decimal | None = None
    for index, row in enumerate(active_brackets):
        min_salary = _decimal(row.min_salary)
        max_salary = _decimal(row.max_salary) if row.max_salary is not None else None
        if previous_max is not None and min_salary != previous_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Active tax brackets must be continuous without gaps or overlaps",
            )
        if max_salary is not None and max_salary <= min_salary:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each tax bracket max salary must be greater than min salary")
        if max_salary is None and index != len(active_brackets) - 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only the final active tax bracket can have no max salary")
        previous_max = max_salary

    if previous_max is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The final active tax bracket must be open-ended")

    db.query(TaxBracket).delete(synchronize_session=False)
    for row in normalized:
        db.add(
            TaxBracket(
                min_salary=_decimal(row.min_salary),
                max_salary=_decimal(row.max_salary) if row.max_salary is not None else None,
                tax_rate=_normalize_tax_rate(row.tax_rate),
                is_active=row.is_active,
            )
        )
    db.commit()
    return list_tax_brackets(db)


def _get_component_type_map(db: Session) -> dict[str, PayrollComponentType]:
    ensure_default_payroll_component_types(db)
    return {row.code: row for row in db.query(PayrollComponentType).filter(PayrollComponentType.is_active == True).all()}  # noqa: E712


def _build_pay_period_code(period_start, period_end, legal_entity_id: str | None) -> str:
    prefix = "PP"
    if legal_entity_id:
        prefix = f"PP-{legal_entity_id[:8].upper()}"
    return f"{prefix}-{period_start.strftime('%Y%m%d')}-{period_end.strftime('%Y%m%d')}"


def _build_pay_period_name(period_start, period_end) -> str:
    if period_start.month == period_end.month and period_start.year == period_end.year:
        return period_start.strftime("%B %Y Payroll")
    return f"Payroll {period_start.isoformat()} to {period_end.isoformat()}"


def _get_or_create_pay_period(
    db: Session,
    *,
    period_start,
    period_end,
    legal_entity_id: str | None,
    branch_id: str | None,
    frequency: str,
) -> PayPeriod:
    pay_period = (
        db.query(PayPeriod)
        .filter(
            PayPeriod.legal_entity_id == legal_entity_id,
            PayPeriod.period_start == period_start,
            PayPeriod.period_end == period_end,
        )
        .first()
    )
    if pay_period:
        return pay_period

    pay_period = PayPeriod(
        legal_entity_id=legal_entity_id,
        branch_id=branch_id,
        code=_build_pay_period_code(period_start, period_end, legal_entity_id),
        name=_build_pay_period_name(period_start, period_end),
        frequency=frequency,
        period_start=period_start,
        period_end=period_end,
        pay_date=period_end,
        status="open",
        is_locked=False,
    )
    db.add(pay_period)
    db.flush()
    return pay_period


def _active_components_for_period(db: Session, employee_id: str, *, period_start, period_end) -> list[EmployeePayrollComponent]:
    return (
        db.query(EmployeePayrollComponent)
        .options(joinedload(EmployeePayrollComponent.component_type))
        .filter(
            EmployeePayrollComponent.employee_id == employee_id,
            EmployeePayrollComponent.is_active == True,  # noqa: E712
            EmployeePayrollComponent.effective_from <= period_end,
            (EmployeePayrollComponent.effective_to.is_(None) | (EmployeePayrollComponent.effective_to >= period_start)),
        )
        .all()
    )


def _component_line(
    *,
    code: str,
    name: str,
    category: str,
    amount: Decimal,
    source: str,
    quantity: float | None = None,
    rate: Decimal | None = None,
    component_type_id: int | None = None,
    taxable: bool = False,
) -> dict:
    return {
        "component_type_id": component_type_id,
        "code": code,
        "name": name,
        "category": category,
        "amount": _money(amount),
        "source": source,
        "quantity": quantity,
        "rate": _money(rate) if rate is not None else None,
        "taxable": taxable,
    }


def _count_weekdays(period_start: date, period_end: date) -> int:
    total = 0
    current = period_start
    while current <= period_end:
        if current.weekday() < 5:
            total += 1
        current += timedelta(days=1)
    return total


def _count_present_weekdays(attendance: list[AttendanceLog]) -> int:
    return len({log.date for log in attendance if log.date.weekday() < 5})


def get_payroll_setup(db: Session) -> dict:
    ensure_default_payroll_component_types(db)
    ensure_default_cambodia_tax_brackets(db)
    settings = get_settings(db)
    departments = [row[0] for row in db.query(Employee.department).filter(Employee.status == "active").distinct().order_by(Employee.department).all()]
    pay_periods = db.query(PayPeriod).order_by(PayPeriod.period_end.desc()).limit(12).all()
    components = db.query(PayrollComponentType).filter(PayrollComponentType.is_active == True).order_by(PayrollComponentType.category, PayrollComponentType.name).all()  # noqa: E712
    return {
        "departments": departments,
        "pay_cycle": settings.pay_cycle,
        "currency": settings.currency,
        "tax_brackets": list_tax_brackets(db),
        "component_types": [
            {
                "id": row.id,
                "code": row.code,
                "name": row.name,
                "category": row.category,
                "calculation_mode": row.calculation_mode,
                "is_taxable": row.is_taxable,
            }
            for row in components
        ],
        "pay_periods": [
            {
                "id": row.id,
                "code": row.code,
                "name": row.name,
                "period_start": row.period_start,
                "period_end": row.period_end,
                "pay_date": row.pay_date,
                "status": row.status,
                "frequency": row.frequency,
                "is_locked": row.is_locked,
            }
            for row in pay_periods
        ],
    }


def calculate_payroll(db: Session, *, period_start, period_end, department: str | None = None, adjustments=None) -> dict:
    if period_end < period_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Period end must be on or after period start")

    query = db.query(Employee).filter(Employee.status == "active")
    if department and department != "all":
        query = query.filter(Employee.department == department)
    employees = query.order_by(Employee.full_name).all()
    if not employees:
        return {
            "pay_period": None,
            "items": [],
            "totals": {"gross": 0.0, "earnings": 0.0, "tax": 0.0, "insurance": 0.0, "pension": 0.0, "deductions": 0.0, "net": 0.0},
        }

    component_types = _get_component_type_map(db)
    settings = get_settings(db)
    adjustment_map = _collect_adjustments(adjustments)
    ensure_default_cambodia_tax_brackets(db)
    tax_brackets = db.query(TaxBracket).filter(TaxBracket.is_active == True).all()  # noqa: E712

    legal_entity_ids = {employee.legal_entity_id for employee in employees if employee.legal_entity_id}
    branch_ids = {employee.branch_id for employee in employees if employee.branch_id}
    pay_period = _get_or_create_pay_period(
        db,
        period_start=period_start,
        period_end=period_end,
        legal_entity_id=next(iter(legal_entity_ids)) if len(legal_entity_ids) == 1 else None,
        branch_id=next(iter(branch_ids)) if len(branch_ids) == 1 else None,
        frequency=settings.pay_cycle,
    )

    rows = []
    totals = {"gross": Decimal("0.00"), "earnings": Decimal("0.00"), "tax": Decimal("0.00"), "insurance": Decimal("0.00"), "pension": Decimal("0.00"), "deductions": Decimal("0.00"), "net": Decimal("0.00")}

    for employee in employees:
        attendance = (
            db.query(AttendanceLog)
            .filter(AttendanceLog.employee_id == employee.id, AttendanceLog.date >= period_start, AttendanceLog.date <= period_end)
            .all()
        )
        working_days_in_period = _count_weekdays(period_start, period_end)
        days_worked = _count_present_weekdays(attendance)
        hours_worked = round(sum(log.hours_worked or 0 for log in attendance), 2)
        overtime_hours = round(sum(log.overtime_hours or 0 for log in attendance), 2)
        late_minutes = round(sum(log.late_minutes or 0 for log in attendance), 2)

        compensation = resolve_compensation_for_period(db, employee_id=employee.id, as_of=period_end)
        pay_type = compensation.pay_type if compensation else employee.pay_type
        base_salary = _decimal(compensation.base_salary if compensation else employee.base_salary)
        daily_rate = Decimal("0.00")

        if pay_type == "monthly":
            if working_days_in_period > 0:
                daily_rate = _decimal(base_salary / Decimal(str(working_days_in_period)))
                base_pay = _decimal(daily_rate * Decimal(str(days_worked)))
            else:
                base_pay = Decimal("0.00")
        elif pay_type == "daily":
            daily_rate = base_salary
            base_pay = _decimal(base_salary * Decimal(str(days_worked)))
        else:
            base_pay = _decimal(base_salary * Decimal(str(hours_worked)))

        hourly_basis = Decimal("0.00")
        if pay_type == "monthly" and base_salary:
            weekday_divisor = Decimal(str(working_days_in_period or 1))
            hourly_basis = _decimal(base_salary / Decimal(str(settings.hours_per_day)) / weekday_divisor)
        elif pay_type == "daily" and base_salary:
            hourly_basis = _decimal(base_salary / Decimal(str(settings.hours_per_day)))
        elif pay_type == "hourly":
            hourly_basis = base_salary

        overtime_pay = _decimal(hourly_basis * Decimal(str(settings.overtime_multiplier)) * Decimal(str(overtime_hours)))
        bonus = adjustment_map[employee.id]["bonus"]
        allowance = adjustment_map[employee.id]["allowance"]

        earning_lines = [
            _component_line(
                code="base_pay",
                name="Base Pay",
                category="earning",
                amount=base_pay,
                source="system",
                component_type_id=component_types.get("base_pay").id if component_types.get("base_pay") else None,
                taxable=True,
            )
        ]
        if overtime_pay > 0:
            earning_lines.append(
                _component_line(
                    code="overtime_pay",
                    name="Overtime Pay",
                    category="earning",
                    amount=overtime_pay,
                    source="system",
                    quantity=overtime_hours,
                    rate=hourly_basis,
                    component_type_id=component_types.get("overtime_pay").id if component_types.get("overtime_pay") else None,
                    taxable=True,
                )
            )

        recurring_components = _active_components_for_period(db, employee.id, period_start=period_start, period_end=period_end)
        deduction_lines: list[dict] = []
        taxable_extra_earnings = Decimal("0.00")
        recurring_loan_total = Decimal("0.00")

        for component in recurring_components:
            amount = _decimal(component.amount)
            line = _component_line(
                code=component.component_type.code,
                name=component.component_type.name,
                category=component.component_type.category,
                amount=amount,
                source="recurring_component",
                quantity=component.quantity,
                component_type_id=component.component_type_id,
                taxable=component.component_type.is_taxable,
            )
            if component.component_type.category == "earning":
                earning_lines.append(line)
                if component.component_type.is_taxable:
                    taxable_extra_earnings += amount
            else:
                deduction_lines.append(line)
                if component.component_type.code == "loan_repayment":
                    recurring_loan_total += amount

        legacy_deductions = db.query(Deduction).filter(Deduction.employee_id == employee.id).all()
        for item in legacy_deductions:
            amount = _decimal(item.amount)
            code = "loan_repayment" if item.type == "loan" else item.type.lower().replace(" ", "_")
            name = "Loan Repayment" if item.type == "loan" else (item.type.replace("_", " ").title() or "Deduction")
            deduction_lines.append(
                _component_line(
                    code=code,
                    name=name,
                    category="deduction",
                    amount=amount,
                    source="legacy_deduction",
                    component_type_id=component_types.get(code).id if component_types.get(code) else component_types.get("other_deduction").id if component_types.get("other_deduction") else None,
                )
            )
            if code == "loan_repayment":
                recurring_loan_total += amount

        if bonus > 0:
            earning_lines.append(
                _component_line(
                    code="bonus",
                    name="Bonus",
                    category="earning",
                    amount=bonus,
                    source="manual_adjustment",
                    component_type_id=component_types.get("bonus").id if component_types.get("bonus") else None,
                    taxable=True,
                )
            )
        if allowance > 0:
            earning_lines.append(
                _component_line(
                    code="allowance",
                    name="Allowance",
                    category="earning",
                    amount=allowance,
                    source="manual_adjustment",
                    component_type_id=component_types.get("allowance").id if component_types.get("allowance") else None,
                    taxable=False,
                )
            )

        taxable_earnings = base_pay + overtime_pay + taxable_extra_earnings + bonus
        tax = calculate_cambodia_tax(taxable_earnings, tax_brackets)
        insurance = _decimal(taxable_earnings * Decimal(str(settings.insurance_rate)))
        pension = _decimal(taxable_earnings * Decimal(str(settings.pension_rate)))

        deduction_lines.extend(
            [
                _component_line(
                    code="tax",
                    name="Income Tax",
                    category="deduction",
                    amount=tax,
                    source="system",
                    component_type_id=component_types.get("tax").id if component_types.get("tax") else None,
                ),
                _component_line(
                    code="insurance",
                    name="Insurance",
                    category="deduction",
                    amount=insurance,
                    source="system",
                    component_type_id=component_types.get("insurance").id if component_types.get("insurance") else None,
                ),
                _component_line(
                    code="pension",
                    name="Pension",
                    category="deduction",
                    amount=pension,
                    source="system",
                    component_type_id=component_types.get("pension").id if component_types.get("pension") else None,
                ),
            ]
        )

        gross_before_adjustments = base_pay + overtime_pay
        total_earnings = sum((_decimal(line["amount"]) for line in earning_lines), Decimal("0.00"))
        total_deductions = sum((_decimal(line["amount"]) for line in deduction_lines), Decimal("0.00"))
        net = total_earnings - total_deductions

        rows.append(
            {
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "employee_name": employee.full_name,
                "department": employee.department,
                "position": employee.position,
                "pay_type": pay_type,
                "base_salary": _money(base_salary),
                "daily_rate": _money(daily_rate) if daily_rate > 0 else 0.0,
                "working_days_in_period": working_days_in_period,
                "compensation_effective_from": compensation.effective_from.isoformat() if compensation else employee.hire_date.isoformat(),
                "days_worked": days_worked,
                "hours_worked": hours_worked,
                "overtime_hours": overtime_hours,
                "late_minutes": late_minutes,
                "gross_before_adjustments": _money(gross_before_adjustments),
                "gross": _money(total_earnings),
                "tax": _money(tax),
                "insurance": _money(insurance),
                "pension": _money(pension),
                "loan_deduction": _money(recurring_loan_total),
                "bonus": _money(bonus),
                "allowance": _money(allowance),
                "total_earnings": _money(total_earnings),
                "total_deductions": _money(total_deductions),
                "net": _money(net),
                "earning_lines": earning_lines,
                "deduction_lines": deduction_lines,
            }
        )

        totals["gross"] += gross_before_adjustments
        totals["earnings"] += total_earnings
        totals["tax"] += tax
        totals["insurance"] += insurance
        totals["pension"] += pension
        totals["deductions"] += total_deductions
        totals["net"] += net

    db.flush()
    return {
        "pay_period": {
            "id": pay_period.id,
            "code": pay_period.code,
            "name": pay_period.name,
            "frequency": pay_period.frequency,
            "period_start": pay_period.period_start,
            "period_end": pay_period.period_end,
            "pay_date": pay_period.pay_date,
            "status": pay_period.status,
            "is_locked": pay_period.is_locked,
        },
        "items": rows,
        "totals": {key: _money(value) for key, value in totals.items()},
    }


def run_payroll(db: Session, payload: PayrollRunRequest, actor: User | None = None) -> PayrollRun:
    result = calculate_payroll(
        db,
        period_start=payload.period_start,
        period_end=payload.period_end,
        department=payload.department,
        adjustments=payload.adjustments,
    )
    items = result["items"]
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employees found for this payroll run")

    version = 1
    if payload.correction_of_run_id is not None:
        source_run = db.query(PayrollRun).filter(PayrollRun.id == payload.correction_of_run_id).first()
        if not source_run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source payroll run not found")
        if source_run.locked_at is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only locked payroll runs can be corrected")
        version = source_run.version + 1

    pay_period_data = result["pay_period"]
    pay_period = db.query(PayPeriod).filter(PayPeriod.id == pay_period_data["id"]).first() if pay_period_data else None
    payroll_run = PayrollRun(
        pay_period_id=pay_period_data["id"] if pay_period_data else None,
        legal_entity_id=pay_period.legal_entity_id if pay_period else None,
        branch_id=pay_period.branch_id if pay_period else None,
        period_start=payload.period_start,
        period_end=payload.period_end,
        run_date=datetime.utcnow(),
        processed_by=payload.processed_by,
        department_scope=None if payload.department in {None, "", "all"} else payload.department,
        pay_cycle=pay_period_data["frequency"] if pay_period_data else "monthly",
        currency=get_settings(db).currency,
        calculation_version="v2",
        status="draft",
        correction_of_run_id=payload.correction_of_run_id,
        version=version,
        total_gross=result["totals"]["earnings"],
        total_deductions=result["totals"]["deductions"],
        total_net=result["totals"]["net"],
    )
    db.add(payroll_run)
    db.flush()

    settings = get_settings(db)
    for item in items:
        detail = PayrollDetail(
            payroll_run_id=payroll_run.id,
            employee_id=item["employee_id"],
            employee_code_snapshot=item["employee_code"],
            employee_name_snapshot=item["employee_name"],
            department_snapshot=item["department"],
            position_snapshot=item["position"],
            pay_type_snapshot=item["pay_type"],
            base_salary_snapshot=item["base_salary"],
            compensation_effective_from=date.fromisoformat(item["compensation_effective_from"]),
            days_worked_snapshot=item["days_worked"],
            hours_worked_snapshot=item["hours_worked"],
            overtime_hours_snapshot=item["overtime_hours"],
            late_minutes_snapshot=item["late_minutes"],
            gross_before_adjustments=item["gross_before_adjustments"],
            gross_pay=item["total_earnings"],
            tax_deduction=item["tax"],
            insurance_deduction=item["insurance"],
            pension_deduction=item["pension"],
            bonus=item["bonus"],
            allowance=item["allowance"],
            loan_deduction=item["loan_deduction"],
            total_deductions=item["total_deductions"],
            total_earnings=item["total_earnings"],
            net_pay=item["net"],
        )
        db.add(detail)
        db.flush()
        for line in item["earning_lines"] + item["deduction_lines"]:
            db.add(
                PayrollDetailLine(
                    payroll_detail_id=detail.id,
                    component_type_id=line["component_type_id"],
                    code=line["code"],
                    name=line["name"],
                    category=line["category"],
                    amount=line["amount"],
                    quantity=line["quantity"],
                    rate=line["rate"],
                    source=line["source"],
                )
            )
        employee = db.query(Employee).filter(Employee.id == item["employee_id"]).first()
        detail.payslip_path = generate_payslip_pdf(settings, payroll_run, detail, employee)

    if pay_period:
        pay_period.status = "processing" if payload.status == "draft" else "closed"
        pay_period.is_locked = payload.status in {"approved", "paid"}

    db.commit()
    db.refresh(payroll_run)
    record_audit(
        db,
        action="payroll.run",
        table_name="payroll_runs",
        record_id=str(payroll_run.id),
        new_value={
            "status": payroll_run.status,
            "period_start": payload.period_start,
            "period_end": payload.period_end,
            "version": payroll_run.version,
            "correction_of_run_id": payroll_run.correction_of_run_id,
            "pay_period_id": payroll_run.pay_period_id,
            "department_scope": payroll_run.department_scope,
            "calculation_version": payroll_run.calculation_version,
        },
        actor=actor,
    )
    if payload.status in {"approved", "paid"}:
        payroll_run = approve_payroll_run(db, payroll_run.id, actor=actor, mark_paid=payload.status == "paid")
    return payroll_run


def approve_payroll_run(db: Session, payroll_run_id: int, actor: User | None = None, *, mark_paid: bool = False) -> PayrollRun:
    payroll_run = (
        db.query(PayrollRun)
        .options(joinedload(PayrollRun.details).joinedload(PayrollDetail.lines), joinedload(PayrollRun.pay_period))
        .filter(PayrollRun.id == payroll_run_id)
        .first()
    )
    if not payroll_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")
    if payroll_run.locked_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payroll run is already locked")
    payroll_run.status = "approved"
    payroll_run.approved_by = actor.username if actor else "system"
    payroll_run.approved_at = datetime.utcnow()
    payroll_run.locked_at = payroll_run.approved_at
    if payroll_run.pay_period:
        payroll_run.pay_period.status = "closed"
        payroll_run.pay_period.is_locked = True
    if mark_paid:
        payroll_run.status = "paid"
        payroll_run.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(payroll_run)
    record_audit(
        db,
        action="payroll.approve",
        table_name="payroll_runs",
        record_id=str(payroll_run.id),
        new_value={
            "status": payroll_run.status,
            "approved_by": payroll_run.approved_by,
            "approved_at": payroll_run.approved_at,
            "paid_at": payroll_run.paid_at,
            "locked_at": payroll_run.locked_at,
        },
        actor=actor,
    )
    return payroll_run
