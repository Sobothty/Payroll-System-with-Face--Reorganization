"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { Button } from "@/components/ui/legacy-button";
import { Card } from "@/components/ui/legacy-card";
import { apiFetch, downloadWithAuth } from "@/lib/api";
import { showSuccessToast, showToast } from "@/lib/toast";
import type { LeaveItem } from "@/lib/types";

const tabs = ["attendance", "payroll", "overtime", "leave", "audit"] as const;
const tabMeta: Record<(typeof tabs)[number], { label: string; description: string }> = {
  attendance: { label: "Attendance", description: "Daily check-in and check-out records." },
  payroll: { label: "Payroll", description: "Gross, deductions, and net payroll snapshots." },
  overtime: { label: "Overtime", description: "Extra-hour activity captured from attendance." },
  leave: { label: "Leave", description: "Review requests, approve actions, and see workday impact." },
  audit: { label: "Audit", description: "Administrative activity trail across the system." },
};

export default function ReportsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("attendance");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [leaveRows, setLeaveRows] = useState<LeaveItem[]>([]);
  const [processingLeaveId, setProcessingLeaveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === "leave") {
      apiFetch<LeaveItem[]>("/api/leave")
        .then((data) => {
          setLeaveRows(data);
          setRows([]);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
      return;
    }

    apiFetch<{ items: Record<string, unknown>[] }>(`/api/reports/${tab}`)
      .then((data) => {
        setRows(data.items);
        setLeaveRows([]);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [tab]);

  async function handleLeaveDecision(leaveId: number, status: "approved" | "rejected") {
    setProcessingLeaveId(leaveId);
    try {
      await apiFetch(`/api/leave/${leaveId}/decision`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      const refreshed = await apiFetch<LeaveItem[]>("/api/leave");
      setLeaveRows(refreshed);
      showSuccessToast(status === "approved" ? "Leave request approved." : "Leave request rejected.");
    } catch {
      // Toast is shown by apiFetch.
    } finally {
      setProcessingLeaveId(null);
    }
  }

  async function handleExport(format: "xlsx" | "pdf") {
    await downloadWithAuth(`/api/reports/export?report_type=${tab}&format=${format}`, `${tab}.${format === "xlsx" ? "xlsx" : "pdf"}`);
    showSuccessToast(format === "xlsx" ? "Excel export downloaded." : "PDF export downloaded.");
  }

  function refreshCurrentTab() {
    setLoading(true);
    startTransition(() => {
      if (tab === "leave") {
        apiFetch<LeaveItem[]>("/api/leave")
          .then((data) => setLeaveRows(data))
          .catch(() => undefined)
          .finally(() => setLoading(false));
        return;
      }

      apiFetch<{ items: Record<string, unknown>[] }>(`/api/reports/${tab}`)
        .then((data) => setRows(data.items))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    });
    showToast({ tone: "info", message: `Refreshing ${tabMeta[tab].label.toLowerCase()} report...`, durationMs: 1800 });
  }

  const leaveMetrics = useMemo(() => {
    const pending = leaveRows.filter((row) => row.status === "pending").length;
    const approved = leaveRows.filter((row) => row.status === "approved").length;
    const rejected = leaveRows.filter((row) => row.status === "rejected").length;
    const approvedDays = leaveRows
      .filter((row) => row.status === "approved")
      .reduce((sum, row) => sum + (row.leave_days ?? 0), 0);

    return { pending, approved, rejected, approvedDays };
  }, [leaveRows]);

  return (
    <AppPageShell pathname="/reports">
      <div className="form-grid report-page px-4 lg:px-6">
      <Card>
        <div className="report-hero motion-rise">
          <div>
            <h2 className="section-heading" style={{ marginBottom: 10 }}>Reports Workspace</h2>
            <p className="table-subcopy">
              {tabMeta[tab].description} Export data, review trends, and act on pending requests without leaving this screen.
            </p>
          </div>
          <div className="report-toolbar">
            <Button tone="secondary" onClick={refreshCurrentTab} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button tone="secondary" onClick={() => handleExport("xlsx")} disabled={loading}>
              Export Excel
            </Button>
            <Button tone="success" onClick={() => handleExport("pdf")} disabled={loading}>
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="report-tabs motion-rise" style={{ animationDelay: "60ms" }}>
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              className={`report-tab-chip ${tab === item ? "active" : ""}`}
              onClick={() => {
                setLoading(true);
                startTransition(() => setTab(item));
              }}
            >
              <span className="report-tab-title">{tabMeta[item].label}</span>
              <span className="report-tab-description">{tabMeta[item].description}</span>
            </button>
          ))}
        </div>
      </Card>

      {tab === "leave" ? (
        <div className="grid-four motion-rise" style={{ animationDelay: "120ms" }}>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Pending Requests</div>
              <div className="stat-value">{leaveMetrics.pending}</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Approved Requests</div>
              <div className="stat-value">{leaveMetrics.approved}</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Rejected Requests</div>
              <div className="stat-value">{leaveMetrics.rejected}</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card">
              <div className="stat-label">Approved Workdays</div>
              <div className="stat-value">{leaveMetrics.approvedDays}</div>
            </div>
          </Card>
        </div>
      ) : null}

      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">{tabMeta[tab].label} Report</h2>
            <p className="table-subcopy">
              {tab === "leave"
                ? "Pending leave requests can be approved or rejected here. Leave days are calculated using working days only."
                : "Review the current dataset preview before exporting."}
            </p>
          </div>
          <div className="action-row">
            <span className="badge">{loading ? "Loading..." : `${tab === "leave" ? leaveRows.length : rows.length} rows`}</span>
          </div>
        </div>

        {tab === "leave" ? (
          <div className="report-table-shell motion-rise" style={{ animationDelay: "180ms" }}>
            {loading ? (
              <div className="report-empty">
                <h3>Loading leave requests</h3>
                <p>Pulling the latest approval queue and workday calculations.</p>
              </div>
            ) : leaveRows.length === 0 ? (
              <div className="report-empty">
                <h3>No leave requests</h3>
                <p>Once employees submit leave, requests will appear here for review.</p>
              </div>
            ) : (
              <table className="list-table" style={{ marginTop: 14 }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Workdays</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRows.map((row, index) => (
                    <tr key={row.id} className="motion-rise" style={{ animationDelay: `${220 + index * 30}ms` }}>
                      <td>
                        <div className="leave-row-strong">{row.employee_name ?? "Unknown employee"}</div>
                        <div className="muted">{row.employee_id}</div>
                      </td>
                      <td>
                        <span className="role-pill">{row.leave_type}</span>
                      </td>
                      <td>
                        <div>{row.start_date} to {row.end_date}</div>
                        <div className="muted">{row.approved_by ? `Handled by ${row.approved_by}` : "Awaiting review"}</div>
                      </td>
                      <td>
                        <div className="leave-row-strong">{row.leave_days ?? "--"}</div>
                        <div className="muted">Mon to Fri</div>
                      </td>
                      <td>
                        <span className={`status-chip status-${row.status}`}>{row.status}</span>
                      </td>
                      <td>
                        <div className="leave-reason">{row.reason || "No note provided."}</div>
                      </td>
                      <td>
                        {row.status === "pending" ? (
                          <div className="row-actions">
                            <Button
                              tone="success"
                              onClick={() => handleLeaveDecision(row.id, "approved")}
                              disabled={processingLeaveId === row.id}
                            >
                              {processingLeaveId === row.id ? "Working..." : "Approve"}
                            </Button>
                            <Button
                              tone="danger"
                              onClick={() => handleLeaveDecision(row.id, "rejected")}
                              disabled={processingLeaveId === row.id}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="muted">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="report-table-shell motion-rise" style={{ animationDelay: "180ms" }}>
            {loading ? (
              <div className="report-empty">
                <h3>Loading report data</h3>
                <p>Fetching the latest {tabMeta[tab].label.toLowerCase()} dataset.</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="report-empty">
                <h3>No data available</h3>
                <p>The selected report currently has no rows to display.</p>
              </div>
            ) : (
              <table className="list-table" style={{ marginTop: 14 }}>
                <thead>
                  <tr>
                    {(rows[0] ? Object.keys(rows[0]) : []).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${tab}-${index}`} className="motion-rise" style={{ animationDelay: `${220 + index * 20}ms` }}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex}>{String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
      </div>
    </AppPageShell>
  );
}
