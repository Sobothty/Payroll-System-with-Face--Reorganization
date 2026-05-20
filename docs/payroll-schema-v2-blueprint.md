# PulseLedger V2 Payroll Schema Blueprint

This document defines a production-oriented payroll schema blueprint for the current `pp` repo.
It is written against the current backend layout under `backend/app/` and the current V1 schema in `backend/app/models/entities.py`.

The goal is not to redesign everything from zero.
The goal is to evolve the current payroll and attendance system into a stronger Postgres-first model with:

- reproducible payroll runs
- schedule-based attendance
- safer employee master data
- auditable adjustments, deductions, and corrections
- explicit period close and correction workflows

## 1. Current V1 Reality

The current system already has useful foundations:

- `employees`
- `attendance_logs`
- `payroll_runs`
- `payroll_details`
- `deductions`
- `leave_requests`
- `leave_balances`
- `attendance_correction_requests`
- `employee_notifications`
- `telegram_link_sessions`
- `users`
- `audit_logs`
- `system_settings`
- `employee_compensation_history`

The main V1 gaps are:

- attendance rules are hardcoded in service logic instead of driven by shift/policy tables
- payroll details do not snapshot enough calculation inputs for long-term auditability
- deductions are too generic for recurring payroll usage
- no pay-period master table
- no shift assignment model
- no legal-entity or branch structure
- no strong recurring component model for allowances, loans, and deductions
- schema lifecycle still depends on startup bootstrap logic instead of real migrations

## 2. V2 Design Principles

V2 should follow these rules:

1. Every payroll result must be reproducible without depending on mutable live master data.
2. Attendance outcomes must come from shift assignment and policy, not fixed service constants.
3. Recurring employee earnings and deductions must be explicit records, not inferred from loose text types.
4. Corrections must be append-only where possible, not silent overwrites of finalized payroll history.
5. Postgres constraints and indexes should enforce as much integrity as possible.

## 3. Keep, Replace, Add

### Keep with upgrades

- `employees`
- `users`
- `audit_logs`
- `employee_notifications`
- `telegram_link_sessions`
- `leave_requests`
- `leave_balances`

### Replace structurally

- `attendance_logs` -> keep name initially, then evolve into shift-aware attendance records
- `deductions` -> replace with payroll component and loan tables
- `payroll_runs` -> keep concept, expand structure
- `payroll_details` -> replace with snapshot-based detail rows and breakdown rows
- `employee_compensation_history` -> keep concept, tighten rules

### Add

- legal entities and branches
- work shifts
- attendance policies
- employee shift assignments
- pay periods
- payroll earning types
- payroll deduction types
- employee recurring payroll components
- payroll adjustments
- employee loans and loan installments
- payroll detail breakdown rows
- attendance source events

## 4. Target V2 Tables

Below are the target tables, columns, and key rules.

---

## 4.1 Core Organization Tables

### `legal_entities`

Purpose:
Owns payroll boundaries. Required if the system will ever support more than one company or business unit.

Columns:

- `id` UUID primary key
- `code` VARCHAR(50) not null unique
- `name` VARCHAR(150) not null
- `currency` VARCHAR(10) not null
- `country_code` VARCHAR(10) not null
- `timezone` VARCHAR(50) not null
- `is_active` BOOLEAN not null default true
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Indexes:

- unique on `code`

### `branches`

Purpose:
Tracks payroll/attendance location context without overloading `system_settings`.

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `code` VARCHAR(50) not null
- `name` VARCHAR(150) not null
- `address` TEXT null
- `timezone` VARCHAR(50) not null
- `is_active` BOOLEAN not null default true
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`legal_entity_id`, `code`)

Indexes:

- index on `legal_entity_id`

---

## 4.2 Employee Master Data

### `employees`

Purpose:
Main employee master table. Keep the current table name, but strengthen it.

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `branch_id` UUID null references `branches(id)`
- `employee_code` VARCHAR(50) not null
- `full_name` VARCHAR(150) not null
- `email` VARCHAR(150) not null
- `phone` VARCHAR(50) null
- `position` VARCHAR(100) not null
- `department` VARCHAR(100) not null
- `employment_type` VARCHAR(30) not null
  - example values: `permanent`, `contract`, `intern`, `daily_worker`
- `hire_date` DATE not null
- `termination_date` DATE null
- `status` VARCHAR(20) not null
  - example values: `active`, `inactive`, `terminated`, `suspended`
- `default_pay_type` VARCHAR(20) not null
  - example values: `monthly`, `daily`, `hourly`
- `face_folder_path` VARCHAR(255) null
- `telegram_username` VARCHAR(100) null
- `telegram_chat_id` VARCHAR(100) null
- `telegram_notifications_enabled` BOOLEAN not null default false
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`legal_entity_id`, `employee_code`)
- unique (`email`)

Notes:

- remove business dependence on `base_salary` from this table after migration
- salary should come from compensation history, not current-state employee row

### `employee_bank_accounts`

Purpose:
Store payout details separately from general employee data.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `bank_name` VARCHAR(150) not null
- `account_name` VARCHAR(150) not null
- `account_number` VARCHAR(100) not null
- `is_primary` BOOLEAN not null default true
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- only one primary account per employee

---

## 4.3 Compensation and Salary History

### `employee_compensation_history`

Purpose:
Keep the table, but make it authoritative and non-overlapping.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `effective_from` DATE not null
- `effective_to` DATE null
- `pay_type` VARCHAR(20) not null
- `base_salary` NUMERIC(14,2) not null
- `currency` VARCHAR(10) not null
- `reason` VARCHAR(255) null
- `approved_by_user_id` UUID null references `users(id)`
- `created_at` TIMESTAMPTZ not null default now()

Constraints:

- check `base_salary >= 0`
- check `effective_to is null or effective_to >= effective_from`

Indexes:

- index on (`employee_id`, `effective_from`)

Rule:

- application logic must prevent overlapping effective ranges per employee

---

## 4.4 Shift and Attendance Policy

### `work_shifts`

Purpose:
Shift master data.

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `code` VARCHAR(50) not null
- `name` VARCHAR(100) not null
- `start_time` TIME not null
- `end_time` TIME not null
- `break_minutes` INTEGER not null default 0
- `standard_hours` NUMERIC(5,2) not null
- `crosses_midnight` BOOLEAN not null default false
- `is_active` BOOLEAN not null default true
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`legal_entity_id`, `code`)
- check `break_minutes >= 0`
- check `standard_hours >= 0`

### `attendance_policies`

Purpose:
Policy values currently hardcoded in service logic should move here.

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `code` VARCHAR(50) not null
- `name` VARCHAR(100) not null
- `late_grace_minutes` INTEGER not null default 0
- `early_leave_grace_minutes` INTEGER not null default 0
- `overtime_minimum_minutes` INTEGER not null default 0
- `rounding_minutes` INTEGER not null default 0
- `requires_check_out` BOOLEAN not null default true
- `is_active` BOOLEAN not null default true
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`legal_entity_id`, `code`)

### `employee_shift_assignments`

Purpose:
Assign employees to shifts and attendance policies across time.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `shift_id` UUID not null references `work_shifts(id)`
- `attendance_policy_id` UUID not null references `attendance_policies(id)`
- `effective_from` DATE not null
- `effective_to` DATE null
- `created_at` TIMESTAMPTZ not null default now()

Constraints:

- check `effective_to is null or effective_to >= effective_from`

Indexes:

- index on (`employee_id`, `effective_from`)

Rule:

- no overlapping active assignment windows per employee

### `holiday_calendars`

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `holiday_date` DATE not null
- `name` VARCHAR(150) not null
- `is_paid` BOOLEAN not null default true
- `created_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`legal_entity_id`, `holiday_date`)

---

## 4.5 Attendance Capture and Daily Results

### `attendance_events`

Purpose:
Immutable raw attendance events from kiosk/manual/API sources.

Columns:

- `id` UUID primary key
- `employee_id` UUID null references `employees(id)`
- `branch_id` UUID null references `branches(id)`
- `event_type` VARCHAR(20) not null
  - example values: `check_in_attempt`, `check_in_confirmed`, `check_out_attempt`, `check_out_confirmed`, `manual_override`, `face_denied`
- `source` VARCHAR(30) not null
  - example values: `kiosk_face`, `admin_manual`, `api`
- `captured_at` TIMESTAMPTZ not null
- `confidence_score` NUMERIC(5,2) null
- `device_code` VARCHAR(50) null
- `payload_json` JSONB not null default '{}'
- `created_by_user_id` UUID null references `users(id)`

Indexes:

- index on (`employee_id`, `captured_at`)
- index on `event_type`

### `attendance_logs`

Purpose:
Daily resolved attendance result row per employee per work date.
Keep the current table name, but strengthen it into a derived daily record.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `work_date` DATE not null
- `shift_assignment_id` UUID not null references `employee_shift_assignments(id)`
- `check_in` TIMESTAMPTZ null
- `check_out` TIMESTAMPTZ null
- `scheduled_start` TIMESTAMPTZ null
- `scheduled_end` TIMESTAMPTZ null
- `late_minutes` NUMERIC(8,2) not null default 0
- `early_leave_minutes` NUMERIC(8,2) not null default 0
- `hours_worked` NUMERIC(8,2) not null default 0
- `overtime_hours` NUMERIC(8,2) not null default 0
- `attendance_status` VARCHAR(30) not null
  - example values: `present`, `late`, `absent`, `half_day`, `holiday`, `leave`
- `source_status` VARCHAR(30) not null
  - example values: `system`, `corrected`, `manual`
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`employee_id`, `work_date`)
- check `late_minutes >= 0`
- check `early_leave_minutes >= 0`
- check `hours_worked >= 0`
- check `overtime_hours >= 0`

Notes:

- this table becomes the payroll-facing daily attendance source
- raw kiosk/face events should not directly act as payroll truth without a resolved daily row

### `attendance_correction_requests`

Purpose:
Keep table name, strengthen references and approval metadata.

New/updated columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `attendance_log_id` UUID null references `attendance_logs(id)`
- `requested_date` DATE not null
- `issue_type` VARCHAR(50) not null
- `requested_check_in` TIMESTAMPTZ null
- `requested_check_out` TIMESTAMPTZ null
- `reason` TEXT not null
- `status` VARCHAR(20) not null
- `reviewer_user_id` UUID null references `users(id)`
- `review_note` TEXT null
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

---

## 4.6 Payroll Period Control

### `pay_periods`

Purpose:
Explicit payroll windows.

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `code` VARCHAR(50) not null
- `period_start` DATE not null
- `period_end` DATE not null
- `pay_date` DATE not null
- `status` VARCHAR(20) not null
  - example values: `open`, `processing`, `closed`, `paid`
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`legal_entity_id`, `code`)
- check `period_end >= period_start`

Indexes:

- index on (`legal_entity_id`, `period_start`, `period_end`)

---

## 4.7 Payroll Component Masters

### `earning_types`

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `code` VARCHAR(50) not null
- `name` VARCHAR(100) not null
- `taxable` BOOLEAN not null default true
- `pensionable` BOOLEAN not null default true
- `is_active` BOOLEAN not null default true

Constraints:

- unique (`legal_entity_id`, `code`)

### `deduction_types`

Columns:

- `id` UUID primary key
- `legal_entity_id` UUID not null references `legal_entities(id)`
- `code` VARCHAR(50) not null
- `name` VARCHAR(100) not null
- `calculation_method` VARCHAR(20) not null
  - example values: `fixed`, `percentage`
- `is_statutory` BOOLEAN not null default false
- `is_active` BOOLEAN not null default true

Constraints:

- unique (`legal_entity_id`, `code`)

### `employee_pay_components`

Purpose:
Recurring allowances or recurring deductions assigned to employees.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `component_kind` VARCHAR(20) not null
  - example values: `earning`, `deduction`
- `earning_type_id` UUID null references `earning_types(id)`
- `deduction_type_id` UUID null references `deduction_types(id)`
- `amount` NUMERIC(14,2) not null
- `effective_from` DATE not null
- `effective_to` DATE null
- `is_recurring` BOOLEAN not null default true
- `notes` TEXT null
- `created_at` TIMESTAMPTZ not null default now()

Constraints:

- check `amount >= 0`
- exactly one of `earning_type_id` or `deduction_type_id` must be set

### `employee_loans`

Purpose:
Replace the loose “loan in deductions” approach.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `loan_code` VARCHAR(50) not null
- `principal_amount` NUMERIC(14,2) not null
- `remaining_balance` NUMERIC(14,2) not null
- `installment_amount` NUMERIC(14,2) not null
- `start_period_id` UUID not null references `pay_periods(id)`
- `end_period_id` UUID null references `pay_periods(id)`
- `status` VARCHAR(20) not null
  - example values: `active`, `closed`, `cancelled`
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`employee_id`, `loan_code`)
- check `principal_amount >= 0`
- check `remaining_balance >= 0`
- check `installment_amount >= 0`

---

## 4.8 Payroll Run and Snapshot Tables

### `payroll_runs`

Purpose:
Keep table name, but convert it into the top-level payroll execution record.

Columns:

- `id` UUID primary key
- `pay_period_id` UUID not null references `pay_periods(id)`
- `run_code` VARCHAR(50) not null unique
- `run_type` VARCHAR(20) not null
  - example values: `regular`, `correction`, `off_cycle`
- `status` VARCHAR(20) not null
  - example values: `draft`, `approved`, `locked`, `paid`, `cancelled`
- `version` INTEGER not null default 1
- `correction_of_run_id` UUID null references `payroll_runs(id)`
- `processed_by_user_id` UUID null references `users(id)`
- `approved_by_user_id` UUID null references `users(id)`
- `approved_at` TIMESTAMPTZ null
- `locked_at` TIMESTAMPTZ null
- `paid_at` TIMESTAMPTZ null
- `currency` VARCHAR(10) not null
- `total_gross` NUMERIC(16,2) not null default 0
- `total_deductions` NUMERIC(16,2) not null default 0
- `total_net` NUMERIC(16,2) not null default 0
- `calculation_formula_version` VARCHAR(50) not null
- `created_at` TIMESTAMPTZ not null default now()
- `updated_at` TIMESTAMPTZ not null default now()

Indexes:

- index on `pay_period_id`
- index on `status`

### `payroll_details`

Purpose:
One row per employee per payroll run.

Columns:

- `id` UUID primary key
- `payroll_run_id` UUID not null references `payroll_runs(id)`
- `employee_id` UUID not null references `employees(id)`
- `employee_code_snapshot` VARCHAR(50) not null
- `employee_name_snapshot` VARCHAR(150) not null
- `department_snapshot` VARCHAR(100) not null
- `position_snapshot` VARCHAR(100) not null
- `pay_type_snapshot` VARCHAR(20) not null
- `base_salary_snapshot` NUMERIC(14,2) not null
- `attendance_days_snapshot` NUMERIC(8,2) not null default 0
- `hours_worked_snapshot` NUMERIC(8,2) not null default 0
- `overtime_hours_snapshot` NUMERIC(8,2) not null default 0
- `late_minutes_snapshot` NUMERIC(8,2) not null default 0
- `gross_pay` NUMERIC(14,2) not null
- `tax_deduction` NUMERIC(14,2) not null
- `insurance_deduction` NUMERIC(14,2) not null
- `pension_deduction` NUMERIC(14,2) not null
- `other_deductions` NUMERIC(14,2) not null default 0
- `net_pay` NUMERIC(14,2) not null
- `payslip_path` VARCHAR(255) null
- `created_at` TIMESTAMPTZ not null default now()

Constraints:

- unique (`payroll_run_id`, `employee_id`)

### `payroll_detail_items`

Purpose:
Breakdown rows for every earning and deduction line.

Columns:

- `id` UUID primary key
- `payroll_detail_id` UUID not null references `payroll_details(id)`
- `item_kind` VARCHAR(20) not null
  - example values: `earning`, `deduction`
- `code` VARCHAR(50) not null
- `name` VARCHAR(100) not null
- `amount` NUMERIC(14,2) not null
- `source_type` VARCHAR(30) not null
  - example values: `base_salary`, `overtime`, `component`, `loan`, `tax`, `insurance`, `pension`, `manual_adjustment`
- `source_reference_id` UUID null
- `notes` TEXT null

Indexes:

- index on `payroll_detail_id`

### `payroll_adjustments`

Purpose:
Explicit one-time pre-run or in-run employee adjustments.

Columns:

- `id` UUID primary key
- `employee_id` UUID not null references `employees(id)`
- `pay_period_id` UUID not null references `pay_periods(id)`
- `item_kind` VARCHAR(20) not null
- `code` VARCHAR(50) not null
- `name` VARCHAR(100) not null
- `amount` NUMERIC(14,2) not null
- `reason` TEXT null
- `created_by_user_id` UUID null references `users(id)`
- `approved_by_user_id` UUID null references `users(id)`
- `status` VARCHAR(20) not null
  - example values: `draft`, `approved`, `applied`, `cancelled`
- `created_at` TIMESTAMPTZ not null default now()

Indexes:

- index on (`employee_id`, `pay_period_id`)

---

## 4.9 Security and Audit

### `users`

Keep table name and current purpose, but in V2:

- use UUID primary key instead of integer
- keep `employee_id` unique nullable reference
- add `created_at`
- add `updated_at`

### `audit_logs`

Keep table name but expand:

- `id` UUID primary key
- `user_id` UUID null references `users(id)`
- `action` VARCHAR(100) not null
- `table_name` VARCHAR(100) not null
- `record_id` VARCHAR(100) not null
- `old_value` JSONB null
- `new_value` JSONB null
- `reason` TEXT null
- `created_at` TIMESTAMPTZ not null default now()

For Postgres, prefer `JSONB` instead of raw text for payload fields.

---

## 5. What to Do with Current V1 Tables

### Keep and evolve directly

- `employees`
- `users`
- `audit_logs`
- `leave_requests`
- `leave_balances`
- `employee_notifications`
- `telegram_link_sessions`
- `system_settings`
- `attendance_correction_requests`

### Keep names but change semantics

- `attendance_logs`
- `payroll_runs`
- `payroll_details`
- `employee_compensation_history`

### Retire

- `deductions`

Replace `deductions` with:

- `deduction_types`
- `employee_pay_components`
- `employee_loans`
- optionally `employee_loan_installments` if you want explicit installment schedule rows

## 6. Migration Order for This Repo

This is the safest migration order for the current repo.

### Phase 0: Platform

1. move fully to Postgres
2. replace startup schema mutation with Alembic migrations
3. freeze V1 schema changes before beginning V2 rollout

### Phase 1: Additive master data

Create new tables:

- `legal_entities`
- `branches`
- `work_shifts`
- `attendance_policies`
- `employee_shift_assignments`
- `holiday_calendars`
- `pay_periods`
- `earning_types`
- `deduction_types`
- `employee_pay_components`
- `employee_loans`
- `employee_bank_accounts`

Backfill:

- create one default legal entity
- create one default branch
- attach all current employees to those defaults
- create one default shift
- create one default attendance policy
- create one open-ended shift assignment for each active employee

### Phase 2: Strengthen current tables without breaking old code

Add columns to existing tables:

- `employees`
  - `legal_entity_id`
  - `branch_id`
  - `employment_type`
  - `termination_date`
  - `default_pay_type`
- `employee_compensation_history`
  - `effective_to`
  - `currency`
  - `approved_by_user_id`
- `attendance_logs`
  - `work_date`
  - `shift_assignment_id`
  - `scheduled_start`
  - `scheduled_end`
  - `early_leave_minutes`
  - `attendance_status`
  - `source_status`
- `payroll_runs`
  - `pay_period_id`
  - `run_code`
  - `run_type`
  - `currency`
  - `calculation_formula_version`
- `payroll_details`
  - snapshot columns for employee and attendance values
  - `other_deductions`

Backfill these from V1 data and defaults.

### Phase 3: Add immutable raw attendance events

Create:

- `attendance_events`

Then update kiosk and future attendance flows to insert raw events first.
Resolved daily attendance rows in `attendance_logs` can still be updated by service logic during this phase.

### Phase 4: Payroll breakdown normalization

Create:

- `payroll_detail_items`
- `payroll_adjustments`

Then update payroll generation code to:

1. compute employee summary row
2. insert `payroll_details`
3. insert line-item breakdown rows

This is the phase where payroll becomes explainable and auditable.

### Phase 5: Deductions replacement

Replace the old `deductions` usage in payroll calculation with:

- employee recurring components
- loan balances
- approved payroll adjustments

Once service code no longer reads `deductions`, deprecate that table.

### Phase 6: Integrity rules

After code is writing V2 columns consistently:

1. add unique (`employee_id`, `work_date`) to `attendance_logs`
2. enforce not-null constraints on new required columns
3. add check constraints for status and numeric safety
4. add overlap-prevention validations for compensation history and shift assignments

### Phase 7: Remove V1 fallback logic

Remove:

- startup schema bootstrap mutation
- V1 payroll calculation assumptions
- any remaining dependency on employee current salary column
- old `deductions` table
- legacy SQLite compatibility paths

## 7. Service Refactor Order

After schema migration scaffolding exists, refactor services in this order:

1. `database.py` and migration tooling
2. attendance service
3. compensation service
4. payroll calculation service
5. leave service only where it depends on employee or policy changes
6. kiosk and self-service read models

Do not start from frontend changes.
Frontend can adapt after the backend contracts stabilize.

## 8. Minimal First Implementation Slice

If you want a practical V2 slice instead of a full rewrite, start here:

1. Alembic
2. `pay_periods`
3. `work_shifts`
4. `attendance_policies`
5. `employee_shift_assignments`
6. stronger `attendance_logs`
7. stronger `payroll_runs`
8. stronger `payroll_details`
9. `payroll_detail_items`

This slice gives the highest gain with the least architectural churn.

## 9. Mapping from Current Repo to V2

### Current `employees`

Keep, but stop using it as the live source of salary truth.

### Current `employee_compensation_history`

Keep and strengthen.
This becomes the source of compensation at payroll calculation time.

### Current `attendance_logs`

Keep the table name for continuity, but convert its meaning from “simple clock row” to “resolved workday attendance record”.

### Current `payroll_runs`

Keep the concept and table name.
Expand it into a proper pay-period execution record.

### Current `payroll_details`

Keep the concept and table name.
Convert it into a snapshot summary row, then add breakdown rows in `payroll_detail_items`.

### Current `deductions`

Plan to remove after V2 payroll components are live.

## 10. Recommended Postgres Data Types

Use these consistently in V2:

- IDs: `UUID`
- dates: `DATE`
- times: `TIME`
- timestamps: `TIMESTAMPTZ`
- money: `NUMERIC(14,2)` or `NUMERIC(16,2)` for totals
- percentages/minutes/hours: `NUMERIC`, not `FLOAT`
- structured audit payloads: `JSONB`

## 11. Final Recommendation

For this repo, the best V2 path is not a destructive big-bang rewrite.

Use additive migrations first.
Keep table names where that reduces service churn.
Move business rules from Python constants into explicit policy and period tables.
Only remove V1 tables after the service layer is fully cut over.
