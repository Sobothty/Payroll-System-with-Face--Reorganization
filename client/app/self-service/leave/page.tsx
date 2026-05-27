"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { Button } from "@/components/ui/legacy-button";
import { Card } from "@/components/ui/legacy-card";
import { Field } from "@/components/ui/legacy-field";
import { apiFetch } from "@/lib/api";
import type { LeaveBalance, LeaveItem } from "@/lib/types";

type MePayload = {
  employee: {
    id: string;
  } | null;
};

export default function SelfServiceLeavePage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveItems, setLeaveItems] = useState<LeaveItem[]>([]);
  const [leaveForm, setLeaveForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });

  async function load() {
    const [meRes, balanceRes, leaveRes] = await Promise.all([
      apiFetch<MePayload>("/api/auth/me"),
      apiFetch<LeaveBalance>("/api/self-service/leave-balance"),
      apiFetch<LeaveItem[]>("/api/leave"),
    ]);
    setMe(meRes);
    setLeaveBalance(balanceRes);
    setLeaveItems(leaveRes);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [meRes, balanceRes, leaveRes] = await Promise.all([
          apiFetch<MePayload>("/api/auth/me"),
          apiFetch<LeaveBalance>("/api/self-service/leave-balance"),
          apiFetch<LeaveItem[]>("/api/leave"),
        ]);

        if (cancelled) {
          return;
        }

        setMe(meRes);
        setLeaveBalance(balanceRes);
        setLeaveItems(leaveRes);
      } catch {
        // Toast is shown by apiFetch.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me?.employee) return;
    await apiFetch("/api/leave", {
      method: "POST",
      body: JSON.stringify({ ...leaveForm, employee_id: me.employee.id }),
    });
    setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
    await load();
  }

  return (
    <AppPageShell pathname="/self-service/leave">
      <div className="form-grid px-4 lg:px-6">
      <Card>
        <h2 className="section-heading">Leave Balance</h2>
        <div className="grid-three">
          <div className="stat-card"><div className="stat-label">Annual</div><div className="stat-value">{leaveBalance?.annual_remaining ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Sick</div><div className="stat-value">{leaveBalance?.sick_remaining ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Unpaid Used</div><div className="stat-value">{leaveBalance?.unpaid_used ?? 0}</div></div>
        </div>
      </Card>

      <div className="grid-two">
        <Card>
          <h2 className="section-heading">Request Leave</h2>
          <form className="form-grid" onSubmit={submitLeave}>
            <Field label="Leave Type">
              <select className="select-input" value={leaveForm.leave_type} onChange={(event) => setLeaveForm({ ...leaveForm, leave_type: event.target.value })}>
                <option value="annual">Annual</option>
                <option value="sick">Sick</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </Field>
            <div className="grid-two">
              <Field label="Start Date">
                <input className="text-input" type="date" value={leaveForm.start_date} onChange={(event) => setLeaveForm({ ...leaveForm, start_date: event.target.value })} />
              </Field>
              <Field label="End Date">
                <input className="text-input" type="date" value={leaveForm.end_date} onChange={(event) => setLeaveForm({ ...leaveForm, end_date: event.target.value })} />
              </Field>
            </div>
            <Field label="Reason">
              <textarea className="text-area" value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} />
            </Field>
            <Button type="submit">Submit Request</Button>
          </form>
        </Card>

        <Card>
          <h2 className="section-heading">Leave History</h2>
          <div className="form-grid">
            {leaveItems.map((item) => (
              <div key={item.id} className="activity-row" style={{ padding: 14 }}>
                <div>
                  <strong>{item.leave_type}</strong>
                  <div className="muted">{item.start_date} → {item.end_date}</div>
                </div>
                <div className="role-pill">{item.status}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      </div>
    </AppPageShell>
  );
}
