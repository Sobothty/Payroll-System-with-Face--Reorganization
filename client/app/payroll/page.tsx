"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api";
import type { PayrollPreviewRow, PayrollRunSummary } from "@/lib/types";

type AdjustmentMap = Record<string, { bonus: number; allowance: number }>;

export default function PayrollPage() {
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState("all");
  const [preview, setPreview] = useState<PayrollPreviewRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [adjustments, setAdjustments] = useState<AdjustmentMap>({});
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [correctionOfRunId, setCorrectionOfRunId] = useState("");

  async function loadRuns() {
    const data = await apiFetch<PayrollRunSummary[]>("/api/payroll/runs");
    setRuns(data);
  }

  useEffect(() => {
    loadRuns().catch(() => undefined);
  }, []);

  async function calculatePayroll() {
    const data = await apiFetch<{ items: PayrollPreviewRow[]; totals: Record<string, number> }>("/api/payroll/calculate", {
      method: "POST",
      body: JSON.stringify({ period_start: periodStart, period_end: periodEnd, department }),
    });
    setPreview(data.items);
    setTotals(data.totals);
  }

  async function submitRun(status: "draft" | "approved") {
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
    await loadRuns();
  }

  return (
    <div className="form-grid">
      <Card>
        <div className="header-row">
          <h2 className="section-heading">Step 1 — Configure Payroll</h2>
          <Button onClick={calculatePayroll}>Calculate Payroll</Button>
        </div>
        <div className="grid-three">
          <Field label="Period Start">
            <input className="text-input" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </Field>
          <Field label="Period End">
            <input className="text-input" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </Field>
          <Field label="Department">
            <select className="select-input" value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="all">All Departments</option>
              <option value="Operations">Operations</option>
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
          </Field>
          <Field label="Correction Of Run">
            <select className="select-input" value={correctionOfRunId} onChange={(event) => setCorrectionOfRunId(event.target.value)}>
              <option value="">New payroll run</option>
              {runs
                .filter((run) => run.locked_at)
                .map((run) => (
                  <option key={run.id} value={run.id}>
                    #{run.id} v{run.version} · {run.period_start} → {run.period_end}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="section-heading">Step 2 — Review</h2>
        <table className="list-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Rate</th>
              <th>Days Worked</th>
              <th>Overtime</th>
              <th>Gross</th>
              <th>Tax</th>
              <th>Insurance</th>
              <th>Pension</th>
              <th>Bonus</th>
              <th>Deductions</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={row.employee_id}>
                <td>{row.employee_name}</td>
                <td>
                  <div>{row.pay_type} · ${row.base_salary}</div>
                  <div className="muted">from {row.compensation_effective_from}</div>
                </td>
                <td>{row.days_worked}</td>
                <td>{row.overtime_hours}</td>
                <td>${row.gross}</td>
                <td>${row.tax}</td>
                <td>${row.insurance}</td>
                <td>${row.pension}</td>
                <td>
                  <input
                    className="text-input"
                    type="number"
                    value={adjustments[row.employee_id]?.bonus ?? 0}
                    onChange={(event) =>
                      setAdjustments((state) => ({
                        ...state,
                        [row.employee_id]: { bonus: Number(event.target.value), allowance: state[row.employee_id]?.allowance ?? 0 },
                      }))
                    }
                  />
                </td>
                <td>${row.loan_deduction}</td>
                <td>${row.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid-four" style={{ marginTop: 18 }}>
          <Card><div className="stat-card"><div className="stat-label">Gross</div><div className="stat-value">${totals.gross ?? 0}</div></div></Card>
          <Card><div className="stat-card"><div className="stat-label">Tax</div><div className="stat-value">${totals.tax ?? 0}</div></div></Card>
          <Card><div className="stat-card"><div className="stat-label">Deductions</div><div className="stat-value">${totals.deductions ?? 0}</div></div></Card>
          <Card><div className="stat-card"><div className="stat-label">Net</div><div className="stat-value">${totals.net ?? 0}</div></div></Card>
        </div>
      </Card>

      <Card>
        <div className="header-row">
          <h2 className="section-heading">Step 3 — Approve</h2>
          <div className="action-row">
            <Button tone="secondary" onClick={() => submitRun("draft")}>
              Save as Draft
            </Button>
            <Button tone="success" onClick={() => submitRun("approved")}>
              Approve & Generate Payslips
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="section-heading">Payroll Run History</h2>
        <table className="list-table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Period</th>
              <th>Status</th>
              <th>Lock</th>
              <th>Approved By</th>
              <th>Totals</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <strong>#{run.id}</strong>
                  <div className="muted">v{run.version}{run.correction_of_run_id ? ` · correction of #${run.correction_of_run_id}` : ""}</div>
                </td>
                <td>{run.period_start} → {run.period_end}</td>
                <td>{run.status}</td>
                <td>{run.locked_at ? "Locked" : "Draft"}</td>
                <td>{run.approved_by ?? "--"}</td>
                <td>${Number(run.total_net).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
