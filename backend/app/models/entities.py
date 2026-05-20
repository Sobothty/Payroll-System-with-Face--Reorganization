import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import relationship

from app.config.database import Base


class LegalEntity(Base):
    __tablename__ = "legal_entities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    country_code = Column(String(10), nullable=False, default="KH")
    timezone = Column(String(50), nullable=False, default="Asia/Phnom_Penh")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    branches = relationship("Branch", back_populates="legal_entity")
    employees = relationship("Employee", back_populates="legal_entity")
    work_shifts = relationship("WorkShift", back_populates="legal_entity")
    attendance_policies = relationship("AttendancePolicy", back_populates="legal_entity")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=True)
    timezone = Column(String(50), nullable=False, default="Asia/Phnom_Penh")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    legal_entity = relationship("LegalEntity", back_populates="branches")
    employees = relationship("Employee", back_populates="branch")


class WorkShift(Base):
    __tablename__ = "work_shifts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_minutes = Column(Integer, nullable=False, default=0)
    standard_hours = Column(Float, nullable=False, default=8)
    crosses_midnight = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    legal_entity = relationship("LegalEntity", back_populates="work_shifts")
    shift_assignments = relationship("EmployeeShiftAssignment", back_populates="shift")


class AttendancePolicy(Base):
    __tablename__ = "attendance_policies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    late_grace_minutes = Column(Integer, nullable=False, default=0)
    early_leave_grace_minutes = Column(Integer, nullable=False, default=0)
    overtime_minimum_minutes = Column(Integer, nullable=False, default=0)
    rounding_minutes = Column(Integer, nullable=False, default=0)
    requires_check_out = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    legal_entity = relationship("LegalEntity", back_populates="attendance_policies")
    shift_assignments = relationship("EmployeeShiftAssignment", back_populates="attendance_policy")


class EmployeeShiftAssignment(Base):
    __tablename__ = "employee_shift_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    shift_id = Column(String(36), ForeignKey("work_shifts.id"), nullable=False, index=True)
    attendance_policy_id = Column(String(36), ForeignKey("attendance_policies.id"), nullable=False, index=True)
    effective_from = Column(Date, nullable=False, default=date.today, index=True)
    effective_to = Column(Date, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="shift_assignments")
    shift = relationship("WorkShift", back_populates="shift_assignments")
    attendance_policy = relationship("AttendancePolicy", back_populates="shift_assignments")
    attendance_logs = relationship("AttendanceLog", back_populates="shift_assignment")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True, index=True)
    full_name = Column(String(150), nullable=False)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=False)
    position = Column(String(100), nullable=False)
    employment_type = Column(String(30), nullable=False, default="permanent")
    pay_type = Column(String(20), nullable=False)
    base_salary = Column(Numeric(12, 2), nullable=False, default=0)
    hire_date = Column(Date, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    telegram_username = Column(String(100), nullable=True)
    telegram_chat_id = Column(String(100), nullable=True)
    telegram_notifications_enabled = Column(Boolean, nullable=False, default=False)
    face_folder_path = Column(String(255), nullable=True)
    # Legacy compatibility column for existing SQLite databases.
    # Authentication should use users.hashed_password only.
    initial_password = Column(String(255), nullable=False, default="")
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    attendance_logs = relationship("AttendanceLog", back_populates="employee")
    payroll_details = relationship("PayrollDetail", back_populates="employee")
    payroll_components = relationship("EmployeePayrollComponent", back_populates="employee", cascade="all, delete-orphan")
    deductions = relationship("Deduction", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    user = relationship("User", back_populates="employee", uselist=False)
    leave_balance = relationship("LeaveBalance", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    attendance_corrections = relationship("AttendanceCorrectionRequest", back_populates="employee", cascade="all, delete-orphan")
    notifications = relationship("EmployeeNotification", back_populates="employee", cascade="all, delete-orphan")
    telegram_link_sessions = relationship("TelegramLinkSession", back_populates="employee", cascade="all, delete-orphan")
    legal_entity = relationship("LegalEntity", back_populates="employees")
    branch = relationship("Branch", back_populates="employees")
    shift_assignments = relationship("EmployeeShiftAssignment", back_populates="employee", cascade="all, delete-orphan")
    compensation_history = relationship(
        "EmployeeCompensationHistory",
        back_populates="employee",
        cascade="all, delete-orphan",
        order_by="desc(EmployeeCompensationHistory.effective_from)",
    )


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    shift_assignment_id = Column(String(36), ForeignKey("employee_shift_assignments.id"), nullable=True, index=True)
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=True)
    scheduled_start = Column(DateTime, nullable=True)
    scheduled_end = Column(DateTime, nullable=True)
    hours_worked = Column(Float, nullable=True)
    late_minutes = Column(Float, nullable=False, default=0)
    early_leave_minutes = Column(Float, nullable=False, default=0)
    overtime_hours = Column(Float, nullable=False, default=0)
    attendance_status = Column(String(30), nullable=False, default="present")
    source_status = Column(String(30), nullable=False, default="system")
    date = Column(Date, nullable=False, default=date.today, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_logs")
    shift_assignment = relationship("EmployeeShiftAssignment", back_populates="attendance_logs")


class PayPeriod(Base):
    __tablename__ = "pay_periods"
    __table_args__ = (UniqueConstraint("legal_entity_id", "period_start", "period_end", name="uq_pay_periods_scope_dates"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True, index=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False)
    frequency = Column(String(20), nullable=False, default="monthly")
    period_start = Column(Date, nullable=False, index=True)
    period_end = Column(Date, nullable=False, index=True)
    pay_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="open")
    is_locked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    legal_entity = relationship("LegalEntity")
    branch = relationship("Branch")
    payroll_runs = relationship("PayrollRun", back_populates="pay_period")


class PayrollComponentType(Base):
    __tablename__ = "payroll_component_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(30), nullable=False, default="earning")
    calculation_mode = Column(String(30), nullable=False, default="fixed")
    is_taxable = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee_components = relationship("EmployeePayrollComponent", back_populates="component_type")
    payroll_detail_lines = relationship("PayrollDetailLine", back_populates="component_type")


class EmployeePayrollComponent(Base):
    __tablename__ = "employee_payroll_components"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    component_type_id = Column(Integer, ForeignKey("payroll_component_types.id"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    quantity = Column(Float, nullable=True)
    recurrence = Column(String(20), nullable=False, default="monthly")
    effective_from = Column(Date, nullable=False, default=date.today, index=True)
    effective_to = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="payroll_components")
    component_type = relationship("PayrollComponentType", back_populates="employee_components")


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pay_period_id = Column(Integer, ForeignKey("pay_periods.id"), nullable=True, index=True)
    legal_entity_id = Column(String(36), ForeignKey("legal_entities.id"), nullable=True, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    run_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_by = Column(String(100), nullable=False)
    department_scope = Column(String(100), nullable=True)
    pay_cycle = Column(String(20), nullable=False, default="monthly")
    currency = Column(String(10), nullable=False, default="USD")
    calculation_version = Column(String(30), nullable=False, default="v2")
    status = Column(String(20), nullable=False, default="draft")
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    locked_at = Column(DateTime, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    correction_of_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=True)
    total_gross = Column(Numeric(12, 2), nullable=False, default=0)
    total_deductions = Column(Numeric(12, 2), nullable=False, default=0)
    total_net = Column(Numeric(12, 2), nullable=False, default=0)

    pay_period = relationship("PayPeriod", back_populates="payroll_runs")
    legal_entity = relationship("LegalEntity")
    branch = relationship("Branch")
    details = relationship("PayrollDetail", back_populates="payroll_run", cascade="all, delete-orphan")
    correction_of = relationship("PayrollRun", remote_side=[id], backref="corrections")


class PayrollDetail(Base):
    __tablename__ = "payroll_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    employee_code_snapshot = Column(String(50), nullable=True)
    employee_name_snapshot = Column(String(150), nullable=True)
    department_snapshot = Column(String(100), nullable=True)
    position_snapshot = Column(String(100), nullable=True)
    pay_type_snapshot = Column(String(20), nullable=True)
    base_salary_snapshot = Column(Numeric(12, 2), nullable=False, default=0)
    compensation_effective_from = Column(Date, nullable=True)
    days_worked_snapshot = Column(Integer, nullable=False, default=0)
    hours_worked_snapshot = Column(Float, nullable=False, default=0)
    overtime_hours_snapshot = Column(Float, nullable=False, default=0)
    late_minutes_snapshot = Column(Float, nullable=False, default=0)
    gross_before_adjustments = Column(Numeric(12, 2), nullable=False, default=0)
    gross_pay = Column(Numeric(12, 2), nullable=False, default=0)
    tax_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    insurance_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    pension_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    bonus = Column(Numeric(12, 2), nullable=False, default=0)
    allowance = Column(Numeric(12, 2), nullable=False, default=0)
    loan_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    total_deductions = Column(Numeric(12, 2), nullable=False, default=0)
    total_earnings = Column(Numeric(12, 2), nullable=False, default=0)
    net_pay = Column(Numeric(12, 2), nullable=False, default=0)
    payslip_path = Column(String(255), nullable=True)

    payroll_run = relationship("PayrollRun", back_populates="details")
    employee = relationship("Employee", back_populates="payroll_details")
    lines = relationship("PayrollDetailLine", back_populates="payroll_detail", cascade="all, delete-orphan")


class PayrollDetailLine(Base):
    __tablename__ = "payroll_detail_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payroll_detail_id = Column(Integer, ForeignKey("payroll_details.id"), nullable=False, index=True)
    component_type_id = Column(Integer, ForeignKey("payroll_component_types.id"), nullable=True, index=True)
    code = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(30), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    quantity = Column(Float, nullable=True)
    rate = Column(Numeric(12, 2), nullable=True)
    source = Column(String(30), nullable=False, default="system")

    payroll_detail = relationship("PayrollDetail", back_populates="lines")
    component_type = relationship("PayrollComponentType", back_populates="payroll_detail_lines")


class Deduction(Base):
    __tablename__ = "deductions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    recurring = Column(Boolean, nullable=False, default=False)
    description = Column(Text, nullable=True)

    employee = relationship("Employee", back_populates="deductions")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    approved_by = Column(String(100), nullable=True)
    reason = Column(Text, nullable=True)

    employee = relationship("Employee", back_populates="leave_requests")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, unique=True, index=True)
    annual_remaining = Column(Float, nullable=False, default=0)
    sick_remaining = Column(Float, nullable=False, default=0)
    unpaid_used = Column(Float, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="leave_balance")


class AttendanceCorrectionRequest(Base):
    __tablename__ = "attendance_correction_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    attendance_log_id = Column(Integer, ForeignKey("attendance_logs.id"), nullable=True, index=True)
    requested_date = Column(Date, nullable=False, index=True)
    issue_type = Column(String(50), nullable=False)
    requested_check_in = Column(DateTime, nullable=True)
    requested_check_out = Column(DateTime, nullable=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    reviewer = Column(String(100), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_corrections")
    attendance_log = relationship("AttendanceLog")


class EmployeeNotification(Base):
    __tablename__ = "employee_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, default="general")
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="notifications")


class TelegramLinkSession(Base):
    __tablename__ = "telegram_link_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    start_token = Column(String(80), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="pending")
    telegram_username = Column(String(100), nullable=True)
    telegram_chat_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    connected_at = Column(DateTime, nullable=True)

    employee = relationship("Employee", back_populates="telegram_link_sessions")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True, unique=True)
    username = Column(String(80), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="employee")
    must_change_password = Column(Boolean, nullable=False, default=False)
    is_locked = Column(Boolean, nullable=False, default=False)
    password_changed_at = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)

    employee = relationship("Employee", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(150), nullable=False, default="PulseLedger")
    logo_url = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    currency = Column(String(20), nullable=False, default="USD")
    hours_per_day = Column(Float, nullable=False, default=8)
    days_per_week = Column(Float, nullable=False, default=5)
    overtime_multiplier = Column(Float, nullable=False, default=1.5)
    income_tax_rate = Column(Float, nullable=False, default=0.1)
    insurance_rate = Column(Float, nullable=False, default=0.03)
    pension_rate = Column(Float, nullable=False, default=0.02)
    annual_leave_days = Column(Integer, nullable=False, default=18)
    sick_leave_days = Column(Integer, nullable=False, default=10)
    unpaid_leave_allowed = Column(Boolean, nullable=False, default=True)
    pay_cycle = Column(String(20), nullable=False, default="monthly")
    confidence_threshold = Column(Float, nullable=False, default=60)
    kiosk_reset_timer = Column(Integer, nullable=False, default=3500)


class EmployeeCompensationHistory(Base):
    __tablename__ = "employee_compensation_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    effective_from = Column(Date, nullable=False, index=True)
    pay_type = Column(String(20), nullable=False)
    base_salary = Column(Numeric(12, 2), nullable=False, default=0)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="compensation_history")
