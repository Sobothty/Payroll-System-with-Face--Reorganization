"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api";
import type { AttendanceCorrection, SelfServiceOverview } from "@/lib/types";

type AttendanceRow = {
  id: number;
  employee_id: string;
  check_in: string;
  check_out?: string | null;
  hours_worked?: number | null;
  late_minutes?: number | null;
  overtime_hours?: number | null;
  date: string;
};

export default function SelfServiceAttendancePage() {
  const [overview, setOverview] = useState<SelfServiceOverview | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [correctionForm, setCorrectionForm] = useState({
    attendance_log_id: "",
    requested_date: new Date().toISOString().slice(0, 10),
    issue_type: "missing_check_out",
    requested_check_in: "",
    requested_check_out: "",
    reason: "",
  });

  async function load() {
    const [overviewRes, attendanceRes, correctionRes] = await Promise.all([
      apiFetch<SelfServiceOverview>("/api/self-service/overview"),
      apiFetch<AttendanceRow[]>("/api/attendance"),
      apiFetch<AttendanceCorrection[]>("/api/attendance/corrections"),
    ]);
    setOverview(overviewRes);
    setAttendance(attendanceRes);
    setCorrections(correctionRes);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const attendanceMap = useMemo(() => attendance.reduce<Record<string, AttendanceRow>>((acc, row) => {
    acc[row.date] = row;
    return acc;
  }, {}), [attendance]);

  const today = new Date();
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch("/api/attendance/corrections", {
      method: "POST",
      body: JSON.stringify({
        attendance_log_id: correctionForm.attendance_log_id ? Number(correctionForm.attendance_log_id) : null,
        requested_date: correctionForm.requested_date,
        issue_type: correctionForm.issue_type,
        requested_check_in: correctionForm.requested_check_in || null,
        requested_check_out: correctionForm.requested_check_out || null,
        reason: correctionForm.reason,
      }),
    });
    setCorrectionForm({
      attendance_log_id: "",
      requested_date: new Date().toISOString().slice(0, 10),
      issue_type: "missing_check_out",
      requested_check_in: "",
      requested_check_out: "",
      reason: "",
    });
    await load();
  }

  return (
    <div className="form-grid">
      <div className="grid-three">
        <Card><div className="stat-card"><div className="stat-label">Days Logged</div><div className="stat-value">{overview?.monthly_days_worked ?? 0}</div></div></Card>
        <Card><div className="stat-card"><div className="stat-label">Late Count</div><div className="stat-value">{overview?.monthly_late_count ?? 0}</div></div></Card>
        <Card><div className="stat-card"><div className="stat-label">Overtime Hrs</div><div className="stat-value">{overview?.monthly_overtime_hours?.toFixed(1) ?? "0.0"}</div></div></Card>
      </div>

      <Card>
        <h2 className="section-heading">Monthly Attendance</h2>
        <div className="mini-grid">
          {Array.from({ length: monthDays }, (_, index) => {
            const day = index + 1;
            const date = new Date(today.getFullYear(), today.getMonth(), day).toISOString().slice(0, 10);
            const row = attendanceMap[date];
            const stateClass = !row ? "absent" : (row.late_minutes ?? 0) > 0 ? "late" : "present";
            return (
              <div key={date} className={`calendar-cell ${stateClass}`}>
                <strong>{day}</strong>
                <div className="muted">{row ? `${row.hours_worked ?? 0}h` : "No log"}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid-two">
        <Card>
          <h2 className="section-heading">Attendance Correction Request</h2>
          <form className="form-grid" onSubmit={submitCorrection}>
            <div className="grid-two">
              <Field label="Attendance Log">
                <select className="select-input" value={correctionForm.attendance_log_id} onChange={(event) => setCorrectionForm({ ...correctionForm, attendance_log_id: event.target.value })}>
                  <option value="">Select a recent log</option>
                  {attendance.slice(0, 20).map((item) => (
                    <option key={item.id} value={item.id}>{item.date} · {item.check_in ? new Date(item.check_in).toLocaleTimeString() : "--"}</option>
                  ))}
                </select>
              </Field>
              <Field label="Issue Type">
                <select className="select-input" value={correctionForm.issue_type} onChange={(event) => setCorrectionForm({ ...correctionForm, issue_type: event.target.value })}>
                  <option value="missing_check_out">Missing check out</option>
                  <option value="missing_check_in">Missing check in</option>
                  <option value="wrong_time">Wrong time</option>
                  <option value="general">General issue</option>
                </select>
              </Field>
            </div>
            <div className="grid-three">
              <Field label="Requested Date">
                <input className="text-input" type="date" value={correctionForm.requested_date} onChange={(event) => setCorrectionForm({ ...correctionForm, requested_date: event.target.value })} />
              </Field>
              <Field label="Requested Check In">
                <input className="text-input" type="datetime-local" value={correctionForm.requested_check_in} onChange={(event) => setCorrectionForm({ ...correctionForm, requested_check_in: event.target.value })} />
              </Field>
              <Field label="Requested Check Out">
                <input className="text-input" type="datetime-local" value={correctionForm.requested_check_out} onChange={(event) => setCorrectionForm({ ...correctionForm, requested_check_out: event.target.value })} />
              </Field>
            </div>
            <Field label="Reason">
              <textarea className="text-area" value={correctionForm.reason} onChange={(event) => setCorrectionForm({ ...correctionForm, reason: event.target.value })} />
            </Field>
            <Button type="submit">Submit Correction Request</Button>
          </form>
        </Card>

        <Card>
          <h2 className="section-heading">Correction History</h2>
          <div className="form-grid">
            {corrections.map((item) => (
              <div key={item.id} className="activity-row" style={{ padding: 14 }}>
                <div>
                  <strong>{item.issue_type.replaceAll("_", " ")}</strong>
                  <div className="muted">{item.requested_date} · {item.reason}</div>
                </div>
                <div className="role-pill">{item.status}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
