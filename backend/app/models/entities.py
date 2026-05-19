from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True)
    full_name = Column(String(150), nullable=False)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=False)
    position = Column(String(100), nullable=False)
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
    deductions = relationship("Deduction", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    user = relationship("User", back_populates="employee", uselist=False)
    leave_balance = relationship("LeaveBalance", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    attendance_corrections = relationship("AttendanceCorrectionRequest", back_populates="employee", cascade="all, delete-orphan")
    notifications = relationship("EmployeeNotification", back_populates="employee", cascade="all, delete-orphan")
    telegram_link_sessions = relationship("TelegramLinkSession", back_populates="employee", cascade="all, delete-orphan")
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
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=True)
    hours_worked = Column(Float, nullable=True)
    late_minutes = Column(Float, nullable=False, default=0)
    overtime_hours = Column(Float, nullable=False, default=0)
    date = Column(Date, nullable=False, default=date.today, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_logs")


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    run_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_by = Column(String(100), nullable=False)
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

    details = relationship("PayrollDetail", back_populates="payroll_run", cascade="all, delete-orphan")
    correction_of = relationship("PayrollRun", remote_side=[id], backref="corrections")


class PayrollDetail(Base):
    __tablename__ = "payroll_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payroll_run_id = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False, index=True)
    gross_pay = Column(Numeric(12, 2), nullable=False, default=0)
    tax_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    insurance_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    pension_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    bonus = Column(Numeric(12, 2), nullable=False, default=0)
    allowance = Column(Numeric(12, 2), nullable=False, default=0)
    loan_deduction = Column(Numeric(12, 2), nullable=False, default=0)
    net_pay = Column(Numeric(12, 2), nullable=False, default=0)
    payslip_path = Column(String(255), nullable=True)

    payroll_run = relationship("PayrollRun", back_populates="details")
    employee = relationship("Employee", back_populates="payroll_details")


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
