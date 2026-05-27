"use client";

import { useEffect, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { Card } from "@/components/ui/legacy-card";
import { apiFetch } from "@/lib/api";
import type { EmployeeNotification } from "@/lib/types";

export default function SelfServiceNotificationsPage() {
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);

  useEffect(() => {
    apiFetch<EmployeeNotification[]>("/api/self-service/notifications").then(setNotifications).catch(() => undefined);
  }, []);

  return (
    <AppPageShell pathname="/self-service/notifications">
      <div className="px-4 lg:px-6">
        <Card>
          <h2 className="section-heading">Notifications</h2>
          <div className="form-grid">
            {notifications.map((item) => (
              <div key={item.id} className="activity-row" style={{ padding: 14 }}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted">{item.message}</div>
                </div>
                <div className="helper-text">{new Date(item.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppPageShell>
  );
}
