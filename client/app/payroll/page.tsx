"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api";
import type { PayrollPayPeriod, PayrollPreviewRow, PayrollRunSummary, PayrollSetup } from "@/lib/types";

type AdjustmentMap = Record<string, { bonus: number; allowance: number }>;
type Totals = Record<string, number>;

type PayrollPreviewResponse = {
  pay_period: PayrollPayPeriod | null;
  items: PayrollPreviewRow[];
  totals: Totals;
};

export default function PayrollPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [department, setDepartment] = useState("all");
  const [preview, setPreview] = useState<PayrollPreviewRow[]>([]);
  const [totals, setTotals] = useState<Totals>({});
  const [adjustments, setAdjustments] = useState<AdjustmentMap>({});
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [setup, setSetup] = useState<PayrollSetup | null>(null);
  const [payPeriod, setPayPeriod] = useState<PayrollPayPeriod | null>(null);
  const [correctionOfRunId, setCorrectionOfRunId] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewDirty, setPreviewDirty] = useState(false);

  async function loadRuns() {
    const data = await apiFetch<PayrollRunSummary[]>("/api/payroll/runs");
    setRuns(data);
  }

  async function loadSetup() {
    const data = await apiFetch<PayrollSetup>("/api/payroll/setup");
    setSetup(data);
  }

  useEffect(() => {
    Promise.all([loadSetup(), loadRuns()]).catch((err: Error) => setError(err.message));
  }, []);

  async function calculatePayroll() {
    setLoadingPreview(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        period_start: periodStart,
        period_end: periodEnd,
        department,
        adjustments: Object.entries(adjustments).map(([employee_id, values]) => ({ employee_id, ...values })),
      };
      const data = await apiFetch<PayrollPreviewResponse>("/api/payroll/calculate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPreview(data.items);
      setTotals(data.totals);
      setPayPeriod(data.pay_period);
      setPreviewDirty(false);
      if (data.items.length === 0) {
        setMessage("No active employees matched this payroll scope.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate payroll");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function submitRun(status: "draft" | "approved" | "paid") {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/payroll/run", {
        method: "POST",
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          department,
          processed_by: "admin",
          status,
          correction_of_run_id: correctionOfRunId ? Number(correctionOfRunId) : null,
          adjustments: Object.entries(adjustments).map(([employee_id, values]) => ({ employee_id, ...values })),
        }),
      });
      await Promise.all([loadRuns(), loadSetup(), calculatePayroll()]);
      setMessage(status === "draft" ? "Payroll run saved as draft." : status === "approved" ? "Payroll run approved and locked." : "Payroll run marked as paid.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payroll run");
    } finally {
      setSubmitting(false);
    }
  }

  function setAdjustment(employeeId: string, field: "bonus" | "allowance", value: number) {
    setAdjustments((state) => ({
      ...state,
      [employeeId]: {
        bonus: field === "bonus" ? value : state[employeeId]?.bonus ?? 0,
        allowance: field === "allowance" ? value : state[employeeId]?.allowance ?? 0,
      },
    }));
    setPreviewDirty(true);
  }

  const summaryCards = useMemo(
    () => [
      { label: "Gross Base", value: totals.gross ?? 0 },
      { label: "Total Earnings", value: totals.earnings ?? 0 },
      { label: "Total Deductions", value: totals.deductions ?? 0 },
      { label: "Net Payroll", value: totals.net ?? 0 },
    ],
    [totals],
  );

  return (
    <div className="form-grid">
      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Payroll Processing</h2>
            <p className="muted">Prepare a pay period, review attendance-backed payroll, then lock the run.</p>
          </div>
          <div className="action-row">
            <Button tone="secondary" onClick={calculatePayroll} disabled={loadingPreview}>
              {loadingPreview ? "Refreshing..." : "Review Payroll"}
            </Button>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 16, border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.08)", color: "#dc2626", borderRadius: 16, padding: 14 }}>
            {error}
          </div>
        ) : null}
        {message ? (
          <div style={{ marginTop: 16, border: "1px solid rgba(34, 197, 94, 0.25)", background: "rgba(34, 197, 94, 0.08)", color: "#166534", borderRadius: 16, padding: 14 }}>
            {message}
          </div>
        ) : null}

        <div className="grid-three" style={{ marginTop: 18 }}>
          <Field label="Period Start">
            <input className="text-input" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </Field>
          <Field label="Period End">
            <input className="text-input" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </Field>
          <Field label="Department Scope">
            <select className="select-input" value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="all">All Departments</option>
              {(setup?.departments ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Correction Run">
            <select className="select-input" value={correctionOfRunId} onChange={(event) => setCorrectionOfRunId(event.target.value)}>
              <option value="">New payroll run</option>
              {runs
                .filter((run) => run.locked_at)
                .map((run) => (
                  <option key={run.id} value={run.id}>
                    #{run.id} v{run.version} · {run.period_start} to {run.period_end}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div className="grid-four" style={{ marginTop: 18 }}>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Pay Cycle</div>
              <div className="stat-value">{setup?.pay_cycle ?? "--"}</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Currency</div>
              <div className="stat-value">{setup?.currency ?? "USD"}</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Pay Period</div>
              <div className="stat-value" style={{ fontSize: "1rem" }}>
                {payPeriod?.code ?? "--"}
              </div>
            </div>
          </Card>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Employees In Scope</div>
              <div className="stat-value">{preview.length}</div>
            </div>
          </Card>
        </div>
      </Card>

      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Payroll Summary</h2>
            <p className="muted">
              {payPeriod
                ? `${payPeriod.name} · ${payPeriod.period_start} to ${payPeriod.period_end}`
                : "Run a preview to create a pay period summary."}
            </p>
          </div>
          {previewDirty ? <span className="badge badge-warning">Preview needs refresh after adjustment edits</span> : null}
        </div>

        <div className="grid-four" style={{ marginTop: 18 }}>
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <div className="stat-card">
                <div className="stat-label">{card.label}</div>
                <div className="stat-value">${Number(card.value).toLocaleString()}</div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Employee Breakdown</h2>
            <p className="muted">Attendance, compensation basis, earnings, deductions, and manual adjustments per employee.</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          {preview.map((row) => (
            <Card key={row.employee_id}>
              <div className="header-row">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                    {row.employee_name} <span className="muted">({row.employee_code})</span>
                  </h3>
                  <p className="muted" style={{ marginTop: 6 }}>
                    {row.department} · {row.position} · {row.pay_type} rate ${row.base_salary}
                  </p>
                </div>
                <div className="action-row" style={{ alignItems: "center" }}>
                  <span className="badge">{row.days_worked} days</span>
                  <span className="badge">{row.hours_worked} hrs</span>
                  <span className="badge">{row.overtime_hours} OT</span>
                  <span className="badge">{row.late_minutes} late min</span>
                </div>
              </div>

              <div className="grid-three" style={{ marginTop: 16 }}>
                <div>
                  <div className="table-card-title">Earnings</div>
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Source</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.earning_lines.map((line) => (
                        <tr key={`${row.employee_id}-${line.code}-${line.source}`}>
                          <td>{line.name}</td>
                          <td>{line.source.replaceAll("_", " ")}</td>
                          <td>${Number(line.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="table-card-title">Deductions</div>
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Source</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.deduction_lines.map((line) => (
                        <tr key={`${row.employee_id}-${line.code}-${line.source}`}>
                          <td>{line.name}</td>
                          <td>{line.source.replaceAll("_", " ")}</td>
                          <td>${Number(line.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="table-card-title">Adjustments</div>
                  <div className="form-grid" style={{ gap: 12 }}>
                    <Field label="Bonus">
                      <input
                        className="text-input"
                        type="number"
                        value={adjustments[row.employee_id]?.bonus ?? row.bonus}
                        onChange={(event) => setAdjustment(row.employee_id, "bonus", Number(event.target.value))}
                      />
                    </Field>
                    <Field label="Allowance">
                      <input
                        className="text-input"
                        type="number"
                        value={adjustments[row.employee_id]?.allowance ?? row.allowance}
                        onChange={(event) => setAdjustment(row.employee_id, "allowance", Number(event.target.value))}
                      />
                    </Field>
                    <div className="muted">Compensation effective from {row.compensation_effective_from}</div>
                  </div>
                </div>
              </div>

              <div className="grid-four" style={{ marginTop: 16 }}>
                <Card>
                  <div className="stat-card">
                    <div className="stat-label">Gross Base</div>
                    <div className="stat-value">${row.gross_before_adjustments}</div>
                  </div>
                </Card>
                <Card>
                  <div className="stat-card">
                    <div className="stat-label">Total Earnings</div>
                    <div className="stat-value">${row.total_earnings}</div>
                  </div>
                </Card>
                <Card>
                  <div className="stat-card">
                    <div className="stat-label">Total Deductions</div>
                    <div className="stat-value">${row.total_deductions}</div>
                  </div>
                </Card>
                <Card>
                  <div className="stat-card">
                    <div className="stat-label">Net Pay</div>
                    <div className="stat-value">${row.net}</div>
                  </div>
                </Card>
              </div>
            </Card>
          ))}

          {preview.length === 0 ? <div className="muted">No preview data yet.</div> : null}
        </div>
      </Card>

      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Finalize Run</h2>
            <p className="muted">Draft keeps the run open. Approve locks it. Paid marks settlement completion.</p>
          </div>
          <div className="action-row">
            <Button tone="secondary" onClick={() => submitRun("draft")} disabled={submitting || preview.length === 0}>
              Save Draft
            </Button>
            <Button tone="success" onClick={() => submitRun("approved")} disabled={submitting || preview.length === 0}>
              Approve Run
            </Button>
            <Button onClick={() => submitRun("paid")} disabled={submitting || preview.length === 0}>
              Mark Paid
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Payroll Run History</h2>
            <p className="muted">Recent payroll runs with lock state, scope, and totals.</p>
          </div>
        </div>
        <table className="list-table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Run</th>
              <th>Period</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <strong>#{run.id}</strong>
                  <div className="muted">
                    v{run.version}
                    {run.correction_of_run_id ? ` · correction of #${run.correction_of_run_id}` : ""}
                  </div>
                </td>
                <td>
                  <div>
                    {run.period_start} to {run.period_end}
                  </div>
                  <div className="muted">{run.pay_cycle ?? "monthly"} · {run.currency ?? "USD"}</div>
                </td>
                <td>{run.department_scope ?? "All Departments"}</td>
                <td>
                  <div>{run.status}</div>
                  <div className="muted">{run.locked_at ? "Locked" : "Open"}</div>
                </td>
                <td>{run.employee_count ?? "--"}</td>
                <td>${Number(run.total_net).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
