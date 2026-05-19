"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch, downloadWithAuth } from "@/lib/api";

const tabs = ["attendance", "payroll", "overtime", "leave", "audit"] as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("attendance");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiFetch<{ items: Record<string, unknown>[] }>(`/api/reports/${tab}`).then((data) => setRows(data.items)).catch(() => undefined);
  }, [tab]);

  return (
    <div className="form-grid">
      <Card>
        <div className="filters-row">
          {tabs.map((item) => (
            <Button key={item} tone={tab === item ? "primary" : "secondary"} onClick={() => setTab(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">{tab[0].toUpperCase() + tab.slice(1)} Report</h2>
            <p className="table-subcopy">Generate a preview table and export through the backend report service.</p>
          </div>
          <div className="action-row">
            <Button tone="secondary" onClick={() => downloadWithAuth(`/api/reports/export?report_type=${tab}&format=xlsx`, `${tab}.xlsx`)}>
              Export Excel
            </Button>
            <Button tone="success" onClick={() => downloadWithAuth(`/api/reports/export?report_type=${tab}&format=pdf`, `${tab}.pdf`)}>
              Export PDF
            </Button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
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
                <tr key={`${tab}-${index}`}>
                  {Object.values(row).map((value, cellIndex) => (
                    <td key={cellIndex}>{String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
