from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeBase(BaseModel):
    full_name: str
    employee_code: str
    department: str
    position: str
    employment_type: Literal["permanent", "contract", "intern", "daily_worker"] = "permanent"
    pay_type: Literal["monthly", "daily", "hourly"]
    base_salary: float = Field(ge=0)
    hire_date: date
    email: EmailStr
    phone: str | None = None
    status: Literal["active", "inactive"] = "active"


class EmployeeCreate(EmployeeBase):
    temporary_password: str = Field(min_length=8)
    compensation_effective_from: date | None = None
    compensation_reason: str | None = None


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    position: str | None = None
    employment_type: Literal["permanent", "contract", "intern", "daily_worker"] | None = None
    pay_type: Literal["monthly", "daily", "hourly"] | None = None
    base_salary: float | None = Field(default=None, ge=0)
    hire_date: date | None = None
    email: EmailStr | None = None
    phone: str | None = None
    telegram_username: str | None = None
    telegram_chat_id: str | None = None
    telegram_notifications_enabled: bool | None = None
    status: Literal["active", "inactive"] | None = None
    new_password: str | None = Field(default=None, min_length=8)
    compensation_effective_from: date | None = None
    compensation_reason: str | None = None


class EmployeeCompensationHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    effective_from: date
    pay_type: str
    base_salary: float
    reason: str | None
    created_at: datetime


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    employee_code: str
    legal_entity_id: str | None = None
    branch_id: str | None = None
    department: str
    position: str
    employment_type: str
    pay_type: str
    base_salary: float
    hire_date: date
    email: str
    phone: str | None
    telegram_username: str | None
    telegram_chat_id: str | None
    telegram_notifications_enabled: bool
    face_folder_path: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    compensation_history: list[EmployeeCompensationHistoryOut] = Field(default_factory=list)


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    username: str
    must_change_password: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class FaceRegistrationRequest(BaseModel):
    employee_id: str
    frames: list[str] = Field(min_length=10, max_length=10)


class AttendanceUpdate(BaseModel):
    check_in: datetime | None = None
    check_out: datetime | None = None
    late_minutes: float | None = None
    overtime_hours: float | None = None


class PayrollDetailAdjust(BaseModel):
    employee_id: str
    bonus: float = 0
    allowance: float = 0


class PayrollCalculateRequest(BaseModel):
    period_start: date
    period_end: date
    department: str | None = None
    processed_by: str = "system"
    adjustments: list[PayrollDetailAdjust] = Field(default_factory=list)


class PayrollRunRequest(PayrollCalculateRequest):
    status: Literal["draft", "approved", "paid"] = "draft"
    correction_of_run_id: int | None = None


class LeaveRequestCreate(BaseModel):
    employee_id: str
    leave_type: str
    start_date: date
    end_date: date
    reason: str | None = None


class LeaveBalanceOut(BaseModel):
    annual_remaining: float
    sick_remaining: float
    unpaid_used: float
    updated_at: datetime


class AttendanceCorrectionRequestCreate(BaseModel):
    attendance_log_id: int | None = None
    requested_date: date
    issue_type: Literal["missing_check_in", "missing_check_out", "wrong_time", "general"]
    requested_check_in: datetime | None = None
    requested_check_out: datetime | None = None
    reason: str = Field(min_length=5)


class AttendanceCorrectionDecision(BaseModel):
    status: Literal["approved", "rejected"]
    review_note: str | None = None


class AttendanceCorrectionOut(BaseModel):
    id: int
    employee_id: str
    attendance_log_id: int | None
    requested_date: date
    issue_type: str
    requested_check_in: datetime | None
    requested_check_out: datetime | None
    reason: str
    status: str
    reviewer: str | None
    review_note: str | None
    created_at: datetime


class EmployeeNotificationOut(BaseModel):
    id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime


class TelegramConnectStartOut(BaseModel):
    start_token: str
    connect_url: str
    bot_username: str


class TelegramConnectStatusOut(BaseModel):
    start_token: str
    status: str
    telegram_username: str | None = None
    telegram_chat_id: str | None = None
    connected_at: datetime | None = None


class SelfServiceOverviewOut(BaseModel):
    today_status: str
    checked_in_at: datetime | None = None
    checked_out_at: datetime | None = None
    hours_today: float = 0
    late_today: float = 0
    monthly_days_worked: int = 0
    monthly_late_count: int = 0
    monthly_overtime_hours: float = 0
    pending_leave_requests: int = 0
    pending_correction_requests: int = 0


class LeaveApprovalRequest(BaseModel):
    status: Literal["approved", "rejected"]


class SettingsPayload(BaseModel):
    company_name: str
    logo_url: str | None = None
    address: str | None = None
    currency: str
    hours_per_day: float
    days_per_week: float
    overtime_multiplier: float
    income_tax_rate: float
    insurance_rate: float
    pension_rate: float
    annual_leave_days: int
    sick_leave_days: int
    unpaid_leave_allowed: bool
    pay_cycle: str
    confidence_threshold: float
    kiosk_reset_timer: int


class ProfileUpdate(BaseModel):
    phone: str | None = None
    email: EmailStr | None = None
    telegram_username: str | None = None
    telegram_chat_id: str | None = None
    telegram_notifications_enabled: bool | None = None
