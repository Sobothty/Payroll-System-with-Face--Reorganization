export type Employee = {
  id: string;
  full_name: string;
  employee_code: string;
  department: string;
  position: string;
  pay_type: "monthly" | "daily" | "hourly";
  base_salary: number;
  hire_date: string;
  email: string;
  phone?: string | null;
  telegram_username?: string | null;
  telegram_chat_id?: string | null;
  telegram_notifications_enabled?: boolean;
  face_folder_path?: string | null;
  status: "active" | "inactive";
  compensation_history?: {
    id: number;
    effective_from: string;
    pay_type: "monthly" | "daily" | "hourly";
    base_salary: number;
    reason?: string | null;
    created_at: string;
  }[];
};

export type AttendanceSummary = {
  present_today: number;
  recent_activity: {
    name: string;
    department: string;
    action: string;
    time: string;
    confidence?: number;
  }[];
  daily_attendance: { weekday: string; count: number }[];
};

export type PayrollPreviewRow = {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  position: string;
  pay_type: string;
  base_salary: number;
  compensation_effective_from: string;
  days_worked: number;
  hours_worked: number;
  overtime_hours: number;
  late_minutes: number;
  gross_before_adjustments: number;
  gross: number;
  tax: number;
  insurance: number;
  pension: number;
  loan_deduction: number;
  bonus: number;
  allowance: number;
  total_earnings: number;
  total_deductions: number;
  net: number;
  earning_lines: PayrollComponentLine[];
  deduction_lines: PayrollComponentLine[];
};

export type PayrollRunSummary = {
  id: number;
  pay_period_id?: number | null;
  period_start: string;
  period_end: string;
  run_date: string;
  processed_by: string;
  department_scope?: string | null;
  pay_cycle?: string;
  currency?: string;
  calculation_version?: string;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  locked_at?: string | null;
  version: number;
  correction_of_run_id?: number | null;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count?: number;
};

export type PayrollComponentLine = {
  component_type_id?: number | null;
  code: string;
  name: string;
  category: string;
  amount: number;
  source: string;
  quantity?: number | null;
  rate?: number | null;
  taxable?: boolean;
};

export type PayrollPayPeriod = {
  id: number;
  code: string;
  name: string;
  frequency: string;
  period_start: string;
  period_end: string;
  pay_date?: string | null;
  status: string;
  is_locked: boolean;
};

export type PayrollSetup = {
  departments: string[];
  pay_cycle: string;
  currency: string;
  component_types: {
    id: number;
    code: string;
    name: string;
    category: string;
    calculation_mode: string;
    is_taxable: boolean;
  }[];
  pay_periods: PayrollPayPeriod[];
};

export type Payslip = {
  id: number;
  employee_id: string;
  employee_name: string;
  period_start: string;
  period_end: string;
  net_pay: number;
  status: string;
  payslip_path: string;
};

export type Settings = {
  company_name: string;
  logo_url?: string | null;
  address?: string | null;
  currency: string;
  hours_per_day: number;
  days_per_week: number;
  overtime_multiplier: number;
  income_tax_rate: number;
  insurance_rate: number;
  pension_rate: number;
  annual_leave_days: number;
  sick_leave_days: number;
  unpaid_leave_allowed: boolean;
  pay_cycle: string;
  confidence_threshold: number;
  kiosk_reset_timer: number;
};

export type LeaveItem = {
  id: number;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  approved_by?: string | null;
  reason?: string | null;
};

export type LeaveBalance = {
  annual_remaining: number;
  sick_remaining: number;
  unpaid_used: number;
  updated_at: string;
};

export type AttendanceCorrection = {
  id: number;
  employee_id: string;
  attendance_log_id?: number | null;
  requested_date: string;
  issue_type: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  status: string;
  reviewer?: string | null;
  review_note?: string | null;
  created_at: string;
};

export type EmployeeNotification = {
  id: number;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  created_at: string;
};

export type SelfServiceOverview = {
  today_status: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  hours_today: number;
  late_today: number;
  monthly_days_worked: number;
  monthly_late_count: number;
  monthly_overtime_hours: number;
  pending_leave_requests: number;
  pending_correction_requests: number;
};
