"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch, downloadWithAuth } from "@/lib/api";
import type { Payslip } from "@/lib/types";

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    const query = employeeId ? `?employee_id=${employeeId}` : "";
    apiFetch<Payslip[]>(`/api/payslips${query}`).then(setPayslips).catch(() => undefined);
  }, [employeeId]);

  return (
    <Card>
      <div className="header-row">
        <div>
          <h2 className="section-heading">Payslip Archive</h2>
          <p className="table-subcopy">Filter by employee and open generated WeasyPrint PDFs.</p>
        </div>
        <input className="text-input" placeholder="Employee ID filter" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
      </div>
      <table className="list-table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Period</th>
            <th>Net Pay</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payslips.map((item) => (
            <tr key={item.id}>
              <td>{item.employee_name}</td>
              <td>{item.period_start} → {item.period_end}</td>
              <td>${Number(item.net_pay).toLocaleString()}</td>
              <td>{item.status}</td>
              <td>
                <div className="action-row">
                  <Button tone="secondary" onClick={() => downloadWithAuth(`/api/payslips/${item.id}/download`, `payslip-${item.id}.pdf`)}>
                    Download
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
