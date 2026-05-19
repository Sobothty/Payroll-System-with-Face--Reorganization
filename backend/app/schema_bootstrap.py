from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def bootstrap_phase2a_schema(engine: Engine) -> None:
    inspector = inspect(engine)

    if "users" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("users")}
        for statement, needed in [
            ("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0", "must_change_password"),
            ("ALTER TABLE users ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT 0", "is_locked"),
            ("ALTER TABLE users ADD COLUMN password_changed_at DATETIME", "password_changed_at"),
        ]:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))

    if "payroll_runs" in inspector.get_table_names():
        existing = {column["name"] for column in inspector.get_columns("payroll_runs")}
        additions = [
            ("ALTER TABLE payroll_runs ADD COLUMN approved_by VARCHAR(100)", "approved_by"),
            ("ALTER TABLE payroll_runs ADD COLUMN approved_at DATETIME", "approved_at"),
            ("ALTER TABLE payroll_runs ADD COLUMN paid_at DATETIME", "paid_at"),
            ("ALTER TABLE payroll_runs ADD COLUMN locked_at DATETIME", "locked_at"),
            ("ALTER TABLE payroll_runs ADD COLUMN version INTEGER NOT NULL DEFAULT 1", "version"),
            ("ALTER TABLE payroll_runs ADD COLUMN correction_of_run_id INTEGER", "correction_of_run_id"),
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
        ]
        for statement, needed in additions:
            if needed not in existing:
                with engine.begin() as connection:
                    connection.execute(text(statement))
