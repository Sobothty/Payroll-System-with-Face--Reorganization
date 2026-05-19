"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import type { AttendanceSummary, Employee } from "@/lib/types";

type PayrollRun = {
  id: number;
  total_net: number;
  status: string;
};

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);

  useEffect(() => {
    async function load() {
      const [employeeRes, summaryRes, runRes] = await Promise.all([
        apiFetch<{ items: Employee[] }>("/api/employees?page=1&page_size=200"),
        apiFetch<AttendanceSummary>("/api/attendance/summary"),
        apiFetch<PayrollRun[]>("/api/payroll/runs"),
      ]);
      setEmployees(employeeRes.items);
      setSummary(summaryRes);
      setRuns(runRes);
    }

    load().catch(() => undefined);
  }, []);

  const totalEmployees = employees.length;
  const totalPayroll = runs[0]?.total_net ?? 0;
  const pendingRuns = runs.filter((run) => run.status === "draft").length;
  const departmentCounts = employees.reduce<Record<string, number>>((acc, employee) => {
    acc[employee.department] = (acc[employee.department] ?? 0) + 1;
    return acc;
  }, {});

  const chartColors = ["#4f8ef7", "#22c55e", "#e24b4a", "#f59e0b", "#14b8a6", "#8b5cf6"];
  const donutStops = Object.entries(departmentCounts)
    .map(([department, count], index, items) => {
      const previous = items.slice(0, index).reduce((sum, [, value]) => sum + value, 0);
      const current = previous + count;
      const start = ((previous / totalEmployees) * 100 || 0).toFixed(2);
      const end = ((current / totalEmployees) * 100 || 0).toFixed(2);
      return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="form-grid">
      <div className="grid-four">
        <Card>
          <div className="stat-card">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{totalEmployees}</div>
          </div>
        </Card>
        <Card>
          <div className="stat-card">
            <div className="stat-label">Present Today</div>
            <div className="stat-value">{summary?.present_today ?? 0}</div>
          </div>
        </Card>
        <Card>
          <div className="stat-card">
            <div className="stat-label">Total Payroll This Month</div>
            <div className="stat-value">${Number(totalPayroll).toLocaleString()}</div>
          </div>
        </Card>
        <Card>
          <div className="stat-card">
            <div className="stat-label">Pending Payroll Runs</div>
            <div className="stat-value">{pendingRuns}</div>
          </div>
        </Card>
      </div>

      <div className="grid-two">
        <Card>
          <h2 className="section-heading">Daily Attendance This Week</h2>
          <div className="chart-bars">
            {(summary?.daily_attendance ?? []).map((item) => (
              <div key={item.weekday} className="chart-bar">
                <span style={{ height: `${Math.max(item.count * 24, 18)}px` }} />
                <strong>{item.count}</strong>
                <small className="muted">{item.weekday}</small>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="section-heading">Department Headcount</h2>
          <div className="donut" style={{ background: `conic-gradient(${donutStops || "#1a1e2a 0 100%"})` }} />
          <div className="legend-list">
            {Object.entries(departmentCounts).map(([department, count], index) => (
              <div key={department} className="legend-item">
                <div>
                  <span className="legend-dot" style={{ background: chartColors[index % chartColors.length] }} />
                  {department}
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid-two">
        <Card>
          <div className="header-row">
            <h2 className="section-heading">Recent Check-ins</h2>
            <span className="helper-text">Last 10</span>
          </div>
          <table className="list-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Time</th>
                <th>Action</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.recent_activity ?? []).slice(0, 10).map((item) => (
                <tr key={`${item.name}-${item.time}`} className="activity-row">
                  <td>{item.name}</td>
                  <td>{item.department}</td>
                  <td>{item.time}</td>
                  <td>{item.action}</td>
                  <td>{item.confidence ? `${item.confidence}%` : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="section-heading">Quick Actions</h2>
          <div className="form-grid">
            <Link href="/payroll">
              <Button className="w-full">Run Payroll</Button>
            </Link>
            <Link href="/employees">
              <Button tone="secondary" className="w-full">
                Add Employee
              </Button>
            </Link>
            <Link href="/reports">
              <Button tone="secondary" className="w-full">
                View Reports
              </Button>
            </Link>
            <Link href="/reports">
              <Button tone="success" className="w-full">
                Export
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
