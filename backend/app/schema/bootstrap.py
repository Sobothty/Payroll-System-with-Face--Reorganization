from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def bootstrap_phase2a_schema(engine: Engine) -> None:
    inspector = inspect(engine)

    if "users" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("users")}
        for statement, needed in [
            ("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0", "must_change_password"),
            ("ALTER TABLE users ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT 0", "is_locked"),
            ("ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP", "password_changed_at"),
        ]:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))

    if "system_settings" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("system_settings")}
        additions = [
            ("ALTER TABLE system_settings ADD COLUMN check_in_time TIME NOT NULL DEFAULT '09:00:00'", "check_in_time"),
            ("ALTER TABLE system_settings ADD COLUMN check_out_time TIME NOT NULL DEFAULT '17:00:00'", "check_out_time"),
        ]
        for statement, needed in additions:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))

    if "payroll_runs" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("payroll_runs")}
        additions = [
            ("ALTER TABLE payroll_runs ADD COLUMN approved_by VARCHAR(100)", "approved_by"),
            ("ALTER TABLE payroll_runs ADD COLUMN approved_at TIMESTAMP", "approved_at"),
            ("ALTER TABLE payroll_runs ADD COLUMN paid_at TIMESTAMP", "paid_at"),
            ("ALTER TABLE payroll_runs ADD COLUMN locked_at TIMESTAMP", "locked_at"),
            ("ALTER TABLE payroll_runs ADD COLUMN version INTEGER NOT NULL DEFAULT 1", "version"),
            ("ALTER TABLE payroll_runs ADD COLUMN correction_of_run_id INTEGER", "correction_of_run_id"),
            ("ALTER TABLE payroll_runs ADD COLUMN pay_period_id INTEGER", "pay_period_id"),
            ("ALTER TABLE payroll_runs ADD COLUMN legal_entity_id VARCHAR(36)", "legal_entity_id"),
            ("ALTER TABLE payroll_runs ADD COLUMN branch_id VARCHAR(36)", "branch_id"),
            ("ALTER TABLE payroll_runs ADD COLUMN department_scope VARCHAR(100)", "department_scope"),
            ("ALTER TABLE payroll_runs ADD COLUMN pay_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'", "pay_cycle"),
            ("ALTER TABLE payroll_runs ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'", "currency"),
            ("ALTER TABLE payroll_runs ADD COLUMN calculation_version VARCHAR(30) NOT NULL DEFAULT 'v2'", "calculation_version"),
        ]
        for statement, needed in additions:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))
        with engine.begin() as connection:
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_payroll_runs_pay_period_id ON payroll_runs (pay_period_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_payroll_runs_legal_entity_id ON payroll_runs (legal_entity_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_payroll_runs_branch_id ON payroll_runs (branch_id)"))

    if "payroll_details" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("payroll_details")}
        additions = [
            ("ALTER TABLE payroll_details ADD COLUMN employee_code_snapshot VARCHAR(50)", "employee_code_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN employee_name_snapshot VARCHAR(150)", "employee_name_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN department_snapshot VARCHAR(100)", "department_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN position_snapshot VARCHAR(100)", "position_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN pay_type_snapshot VARCHAR(20)", "pay_type_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN base_salary_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0", "base_salary_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN compensation_effective_from DATE", "compensation_effective_from"),
            ("ALTER TABLE payroll_details ADD COLUMN days_worked_snapshot INTEGER NOT NULL DEFAULT 0", "days_worked_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN hours_worked_snapshot FLOAT NOT NULL DEFAULT 0", "hours_worked_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN overtime_hours_snapshot FLOAT NOT NULL DEFAULT 0", "overtime_hours_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN late_minutes_snapshot FLOAT NOT NULL DEFAULT 0", "late_minutes_snapshot"),
            ("ALTER TABLE payroll_details ADD COLUMN gross_before_adjustments NUMERIC(12, 2) NOT NULL DEFAULT 0", "gross_before_adjustments"),
            ("ALTER TABLE payroll_details ADD COLUMN total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0", "total_deductions"),
            ("ALTER TABLE payroll_details ADD COLUMN total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0", "total_earnings"),
        ]
        for statement, needed in additions:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))

    if "employees" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("employees")}
        additions = [
            ("ALTER TABLE employees ADD COLUMN telegram_username VARCHAR(100)", "telegram_username"),
            ("ALTER TABLE employees ADD COLUMN telegram_chat_id VARCHAR(100)", "telegram_chat_id"),
            ("ALTER TABLE employees ADD COLUMN telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT 0", "telegram_notifications_enabled"),
            ("ALTER TABLE employees ADD COLUMN legal_entity_id VARCHAR(36)", "legal_entity_id"),
            ("ALTER TABLE employees ADD COLUMN branch_id VARCHAR(36)", "branch_id"),
            ("ALTER TABLE employees ADD COLUMN employment_type VARCHAR(30) NOT NULL DEFAULT 'permanent'", "employment_type"),
        ]
        for statement, needed in additions:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))
        with engine.begin() as connection:
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_employees_legal_entity_id ON employees (legal_entity_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_employees_branch_id ON employees (branch_id)"))

    if "attendance_logs" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("attendance_logs")}
        additions = [
            ("ALTER TABLE attendance_logs ADD COLUMN shift_assignment_id VARCHAR(36)", "shift_assignment_id"),
            ("ALTER TABLE attendance_logs ADD COLUMN scheduled_start TIMESTAMP", "scheduled_start"),
            ("ALTER TABLE attendance_logs ADD COLUMN scheduled_end TIMESTAMP", "scheduled_end"),
            ("ALTER TABLE attendance_logs ADD COLUMN early_leave_minutes FLOAT NOT NULL DEFAULT 0", "early_leave_minutes"),
            ("ALTER TABLE attendance_logs ADD COLUMN attendance_status VARCHAR(30) NOT NULL DEFAULT 'present'", "attendance_status"),
            ("ALTER TABLE attendance_logs ADD COLUMN source_status VARCHAR(30) NOT NULL DEFAULT 'system'", "source_status"),
        ]
        for statement, needed in additions:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))
        with engine.begin() as connection:
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_attendance_logs_shift_assignment_id ON attendance_logs (shift_assignment_id)"))
