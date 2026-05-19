"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import type { EmployeeNotification, LeaveBalance, SelfServiceOverview } from "@/lib/types";

type MePayload = {
  must_change_password: boolean;
  employee: {
    full_name: string;
    department: string;
    position: string;
  } | null;
};

export default function SelfServiceOverviewPage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [overview, setOverview] = useState<SelfServiceOverview | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<MePayload>("/api/auth/me"),
      apiFetch<SelfServiceOverview>("/api/self-service/overview"),
      apiFetch<LeaveBalance>("/api/self-service/leave-balance"),
      apiFetch<EmployeeNotification[]>("/api/self-service/notifications"),
    ])
      .then(([meRes, overviewRes, leaveBalanceRes, notificationRes]) => {
        setMe(meRes);
        setOverview(overviewRes);
        setLeaveBalance(leaveBalanceRes);
        setNotifications(notificationRes);
      })
      .catch(() => undefined);
  }, []);

  const todayStatusLabel =
    overview?.today_status === "checked_out"
      ? "Checked out"
      : overview?.today_status === "checked_in"
        ? "Checked in"
        : "Not checked in";

  return (
    <div className="form-grid">
      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Employee Overview</h2>
            <p className="table-subcopy">
              {me?.employee?.full_name} · {me?.employee?.department} · {me?.employee?.position}
            </p>
          </div>
          {me?.must_change_password ? <div className="feedback-banner error">Temporary password must be changed in Profile.</div> : null}
        </div>
      </Card>

      <div className="grid-four">
        <Card><div className="stat-card"><div className="stat-label">Today Status</div><div className="stat-value">{todayStatusLabel}</div></div></Card>
        <Card><div className="stat-card"><div className="stat-label">Hours Today</div><div className="stat-value">{overview?.hours_today?.toFixed(1) ?? "0.0"}</div></div></Card>
        <Card><div className="stat-card"><div className="stat-label">Pending Leave</div><div className="stat-value">{overview?.pending_leave_requests ?? 0}</div></div></Card>
        <Card><div className="stat-card"><div className="stat-label">Pending Corrections</div><div className="stat-value">{overview?.pending_correction_requests ?? 0}</div></div></Card>
      </div>

      <div className="grid-two">
        <Card>
          <h2 className="section-heading">Leave Balance</h2>
          <div className="grid-three">
            <div className="stat-card"><div className="stat-label">Annual</div><div className="stat-value">{leaveBalance?.annual_remaining ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">Sick</div><div className="stat-value">{leaveBalance?.sick_remaining ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">Unpaid Used</div><div className="stat-value">{leaveBalance?.unpaid_used ?? 0}</div></div>
          </div>
        </Card>

        <Card>
          <div className="header-row">
            <h2 className="section-heading">Recent Notifications</h2>
            <Link href="/self-service/notifications"><Button type="button" tone="secondary">View All</Button></Link>
          </div>
          <div className="form-grid">
            {notifications.slice(0, 4).map((item) => (
              <div key={item.id} className="activity-row" style={{ padding: 14 }}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="header-row">
          <h2 className="section-heading">Quick Actions</h2>
        </div>
        <div className="action-row">
          <Link href="/self-service/attendance"><Button type="button">Attendance</Button></Link>
          <Link href="/self-service/leave"><Button type="button" tone="secondary">Request Leave</Button></Link>
          <Link href="/self-service/payslips"><Button type="button" tone="secondary">Payslips</Button></Link>
          <Link href="/self-service/profile"><Button type="button" tone="secondary">Profile</Button></Link>
        </div>
      </Card>
    </div>
  );
}
