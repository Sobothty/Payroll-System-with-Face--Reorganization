"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch, downloadWithAuth } from "@/lib/api";
import type { Payslip } from "@/lib/types";

export default function SelfServicePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    apiFetch<Payslip[]>("/api/payslips").then(setPayslips).catch(() => undefined);
  }, []);

  return (
    <Card>
      <h2 className="section-heading">My Payslips</h2>
      <div className="form-grid">
        {payslips.map((item) => (
          <div key={item.id} className="activity-row" style={{ padding: 14 }}>
            <div>
              <strong>{item.period_start} → {item.period_end}</strong>
              <div className="muted">${Number(item.net_pay).toLocaleString()}</div>
            </div>
            <Button type="button" tone="secondary" onClick={() => downloadWithAuth(`/api/payslips/${item.id}/download`, `my-payslip-${item.id}.pdf`)}>
              Download
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
