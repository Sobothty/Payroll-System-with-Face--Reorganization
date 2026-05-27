"use client";

import { useEffect, useMemo, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { apiFetch } from "@/lib/api";
import type { AttendanceSummary, Employee } from "@/lib/types";

type PayrollRun = {
  id: number;
  total_net: number;
  status: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.round(value))}%`;
}

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      try {
        const [employeeRes, summaryRes, runRes] = await Promise.all([
          apiFetch<{ items: Employee[] }>("/api/employees?page=1&page_size=200"),
          apiFetch<AttendanceSummary>("/api/attendance/summary"),
          apiFetch<PayrollRun[]>("/api/payroll/runs"),
        ]);

        if (cancelled) {
          return;
        }

        setEmployees(employeeRes.items);
        setSummary(summaryRes);
        setRuns(runRes);
      } catch {
        // Toast is shown by apiFetch.
      }
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((employee) => employee.status === "active").length;
  const presentToday = summary?.present_today ?? 0;
  const attendanceRate = totalEmployees ? (presentToday / totalEmployees) * 100 : 0;
  const latestPayrollNet = runs[0]?.total_net ?? 0;
  const draftRuns = runs.filter((run) => run.status === "draft").length;
  const dailyAttendance = summary?.daily_attendance ?? [];
  const recentActivity = (summary?.recent_activity ?? []).slice(0, 5);
  const totalAttendanceThisWeek = dailyAttendance.reduce((sum, item) => sum + item.count, 0);
  const averageAttendance = dailyAttendance.length ? Math.round(totalAttendanceThisWeek / dailyAttendance.length) : 0;

  const departmentData = useMemo(() => {
    const counts = employees.reduce<Record<string, number>>((accumulator, employee) => {
      accumulator[employee.department] = (accumulator[employee.department] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .sort((left, right) => right[1] - left[1])
      .map(([department, count]) => ({
        name: department,
        count,
        percent: totalEmployees ? Math.round((count / totalEmployees) * 100) : 0,
      }));
  }, [employees, totalEmployees]);

  const metricCards = [
    {
      title: "Employees",
      value: totalEmployees.toLocaleString(),
      change: `+${activeEmployees.toLocaleString()} active`,
      summary: "Roster remains in a healthy operating state",
      note: `${activeEmployees.toLocaleString()} active staff across the current roster.`,
      trend: "up" as const,
    },
    {
      title: "Present Today",
      value: presentToday.toLocaleString(),
      change: formatPercent(attendanceRate),
      summary: "Today’s coverage is live from attendance events",
      note: `${formatPercent(attendanceRate)} of the workforce has checked in today.`,
      trend: "up" as const,
    },
    {
      title: "Attendance Rate",
      value: formatPercent(attendanceRate),
      change: `${averageAttendance.toLocaleString()} avg`,
      summary: "Weekly attendance is holding steady",
      note: `${averageAttendance.toLocaleString()} average daily check-ins across the current week.`,
      trend: "up" as const,
    },
    {
      title: "Payroll Net",
      value: formatCurrency(latestPayrollNet),
      change: draftRuns ? `${draftRuns} drafts` : "Ready",
      summary: runs.length ? "Most recent payroll run is ready for review" : "No payroll run has been generated yet",
      note: runs.length ? "Latest payroll net total from the most recent run." : "Generate the first payroll run to populate this metric.",
      trend: draftRuns ? "down" as const : "up" as const,
    },
  ];

  const attendanceSeries = (dailyAttendance.length
    ? dailyAttendance
    : [
        { weekday: "Mon", count: 0 },
        { weekday: "Tue", count: 0 },
        { weekday: "Wed", count: 0 },
        { weekday: "Thu", count: 0 },
        { weekday: "Fri", count: 0 },
      ]).map((item) => ({
    label: item.weekday,
    attendance: item.count,
  }));

  return (
    <AppPageShell pathname="/dashboard">
        <SectionCards items={metricCards} />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive
            data={attendanceSeries}
            departments={departmentData.slice(0, 4)}
            weeklyCheckIns={totalAttendanceThisWeek}
            attendanceRate={attendanceRate}
            totalRuns={runs.length}
          />
        </div>
        <DataTable rows={recentActivity} />
    </AppPageShell>
  );
}
