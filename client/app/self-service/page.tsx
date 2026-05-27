"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  FileText,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionCards } from "@/components/section-cards";
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

function formatHours(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}h`;
}

export default function SelfServiceOverviewPage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [overview, setOverview] = useState<SelfServiceOverview | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      apiFetch<MePayload>("/api/auth/me"),
      apiFetch<SelfServiceOverview>("/api/self-service/overview"),
      apiFetch<LeaveBalance>("/api/self-service/leave-balance"),
      apiFetch<EmployeeNotification[]>("/api/self-service/notifications"),
    ])
      .then(([meRes, overviewRes, leaveBalanceRes, notificationRes]) => {
        if (cancelled) {
          return;
        }
        setMe(meRes);
        setOverview(overviewRes);
        setLeaveBalance(leaveBalanceRes);
        setNotifications(notificationRes);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const todayStatusLabel =
    overview?.today_status === "checked_out"
      ? "Checked out"
      : overview?.today_status === "checked_in"
        ? "Checked in"
        : "Not checked in";

  const metricCards = [
    {
      title: "Today Status",
      value: todayStatusLabel,
      change: overview?.checked_in_at ? "Live" : "Pending",
      summary: overview?.checked_in_at ? "Attendance is recorded for today" : "No attendance record has been created yet",
      note: overview?.checked_in_at
        ? `Check-in at ${new Date(overview.checked_in_at).toLocaleTimeString()}`
        : "Use the kiosk or face registration flow to create today's check-in.",
      trend: overview?.checked_in_at ? ("up" as const) : ("down" as const),
    },
    {
      title: "Hours Today",
      value: formatHours(overview?.hours_today),
      change: `${overview?.late_today ?? 0} min late`,
      summary: "Daily working hours are tracked live",
      note: `${overview?.late_today ?? 0} late minutes currently recorded for today.`,
      trend: "up" as const,
    },
    {
      title: "Pending Leave",
      value: `${overview?.pending_leave_requests ?? 0}`,
      change: `${leaveBalance?.annual_remaining ?? 0} annual`,
      summary: "Leave requests are visible from the employee view",
      note: `${leaveBalance?.annual_remaining ?? 0} annual leave days remain available.`,
      trend: "up" as const,
    },
    {
      title: "Corrections",
      value: `${overview?.pending_correction_requests ?? 0}`,
      change: `${overview?.monthly_late_count ?? 0} late this month`,
      summary: "Attendance corrections can be tracked from one place",
      note: `${formatHours(overview?.monthly_overtime_hours)} overtime logged this month.`,
      trend: "up" as const,
    },
  ];

  const leaveCards = useMemo(
    () => [
      { label: "Annual leave", value: `${leaveBalance?.annual_remaining ?? 0}`, detail: "Days remaining" },
      { label: "Sick leave", value: `${leaveBalance?.sick_remaining ?? 0}`, detail: "Days remaining" },
      { label: "Unpaid used", value: `${leaveBalance?.unpaid_used ?? 0}`, detail: "Days used" },
    ],
    [leaveBalance],
  );

  const quickActions = [
    {
      href: "/self-service/attendance",
      label: "Attendance",
      description: "Review your logs and request corrections.",
      icon: CalendarDays,
    },
    {
      href: "/self-service/leave",
      label: "Request Leave",
      description: "Submit new leave requests and monitor status.",
      icon: Clock3,
    },
    {
      href: "/self-service/payslips",
      label: "Payslips",
      description: "Open current and historical payroll records.",
      icon: FileText,
    },
    {
      href: "/self-service/profile",
      label: "Profile",
      description: "Update personal information and account settings.",
      icon: UserRound,
    },
  ];

  return (
    <AppPageShell pathname="/self-service" toolbar={<Badge variant="outline">{todayStatusLabel}</Badge>}>
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 border-b md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Employee overview</CardTitle>
                <CardDescription>
                  {me?.employee
                    ? `${me.employee.full_name} · ${me.employee.department} · ${me.employee.position}`
                    : "Track attendance, leave, and payroll updates from your self-service workspace."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{todayStatusLabel}</Badge>
                {me?.must_change_password ? (
                  <Badge variant="destructive">
                    <ShieldAlert className="size-3.5" />
                    Change temporary password
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm font-medium">Attendance today</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {overview?.checked_in_at
                      ? `Checked in at ${new Date(overview.checked_in_at).toLocaleTimeString()}${overview.checked_out_at ? ` and checked out at ${new Date(overview.checked_out_at).toLocaleTimeString()}` : ""}.`
                      : "No attendance event has been recorded for today yet."}
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm font-medium">Monthly summary</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {overview?.monthly_days_worked ?? 0} days worked, {overview?.monthly_late_count ?? 0} late entries, and{" "}
                    {formatHours(overview?.monthly_overtime_hours)} overtime this month.
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">Check-in progress</div>
                      <div className="text-xs text-muted-foreground">{formatHours(overview?.hours_today)} logged today</div>
                    </div>
                    <Badge variant="outline">{overview?.late_today ?? 0} min late</Badge>
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">Open requests</div>
                      <div className="text-xs text-muted-foreground">Leave and correction items awaiting action</div>
                    </div>
                    <Badge variant="outline">
                      {(overview?.pending_leave_requests ?? 0) + (overview?.pending_correction_requests ?? 0)} open
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-sm font-medium">Leave balance</div>
                  <div className="mt-1 text-sm text-muted-foreground">Current entitlements available for this employee account.</div>
                </div>
                {leaveCards.map((item) => (
                  <div key={item.label} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.detail}</div>
                      </div>
                      <Badge variant="outline">{item.value}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <SectionCards items={metricCards} />

        <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Recent notifications</CardTitle>
              <CardDescription>Payroll, attendance, and HR updates sent to your employee account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:p-6">
              {notifications.length ? (
                notifications.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Bell className="size-4 text-muted-foreground" />
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{item.message}</div>
                      </div>
                      <Badge variant={item.is_read ? "outline" : "secondary"}>{item.is_read ? "Read" : "New"}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No employee notifications are available yet.
                </div>
              )}
              <div>
                <Button variant="outline" render={<Link href="/self-service/notifications" />}>
                  View all notifications
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Jump directly to the self-service tools used most often.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:p-6">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Button
                    key={action.href}
                    variant="outline"
                    className="h-auto justify-start px-4 py-3 text-left"
                    render={<Link href={action.href} />}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="grid gap-1">
                        <span className="font-medium">{action.label}</span>
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
    </AppPageShell>
  );
}
