"use client";

import { useEffect, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { Button } from "@/components/ui/legacy-button";
import { Card } from "@/components/ui/legacy-card";
import { Field } from "@/components/ui/legacy-field";
import { apiFetch } from "@/lib/api";
import type { Settings } from "@/lib/types";

const defaults: Settings = {
  company_name: "PulseLedger",
  logo_url: "",
  address: "",
  currency: "USD",
  check_in_time: "09:00",
  check_out_time: "17:00",
  hours_per_day: 8,
  days_per_week: 5,
  overtime_multiplier: 1.5,
  income_tax_rate: 0.1,
  insurance_rate: 0.03,
  pension_rate: 0.02,
  annual_leave_days: 18,
  sick_leave_days: 10,
  unpaid_leave_allowed: true,
  pay_cycle: "monthly",
  confidence_threshold: 60,
  kiosk_reset_timer: 3500,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    apiFetch<Settings>("/api/settings")
      .then((nextSettings) => {
        setSettings({
          ...nextSettings,
          check_in_time: (nextSettings.check_in_time || defaults.check_in_time).slice(0, 5),
          check_out_time: (nextSettings.check_out_time || defaults.check_out_time).slice(0, 5),
        });
      })
      .catch(() => undefined);
  }, []);

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      setSettingsMessage("System settings saved.");
    } catch {
      // Toast is shown by apiFetch.
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <AppPageShell pathname="/settings">
      <div className="form-grid px-4 lg:px-6">
      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">System Settings</h2>
            <p className="table-subcopy">Company data, pay rules, social contributions, leave policy, and face matching thresholds.</p>
          </div>
          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {settingsMessage ? <div className="feedback-banner success" style={{ marginTop: 16 }}>{settingsMessage}</div> : null}

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="grid-two">
            <Field label="Company Name">
              <input className="text-input" value={settings.company_name} onChange={(event) => setSettings({ ...settings, company_name: event.target.value })} />
            </Field>
            <Field label="Currency">
              <input className="text-input" value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <textarea className="text-area" value={settings.address ?? ""} onChange={(event) => setSettings({ ...settings, address: event.target.value })} />
          </Field>
          <div className="grid-three">
            <Field label="Check-In Time">
              <input
                className="text-input"
                type="time"
                value={settings.check_in_time}
                onChange={(event) => setSettings({ ...settings, check_in_time: event.target.value })}
              />
            </Field>
            <Field label="Check-Out Time">
              <input
                className="text-input"
                type="time"
                value={settings.check_out_time}
                onChange={(event) => setSettings({ ...settings, check_out_time: event.target.value })}
              />
            </Field>
            <Field label="Hours / Day">
              <input className="text-input" type="number" value={settings.hours_per_day} onChange={(event) => setSettings({ ...settings, hours_per_day: Number(event.target.value) })} />
            </Field>
          </div>
          <div className="grid-two">
            <Field label="Days / Week">
              <input className="text-input" type="number" value={settings.days_per_week} onChange={(event) => setSettings({ ...settings, days_per_week: Number(event.target.value) })} />
            </Field>
            <Field label="OT Multiplier">
              <input
                className="text-input"
                type="number"
                step="0.1"
                value={settings.overtime_multiplier}
                onChange={(event) => setSettings({ ...settings, overtime_multiplier: Number(event.target.value) })}
              />
            </Field>
          </div>
          <div className="grid-two">
            <Field label="Insurance Rate">
              <input className="text-input" type="number" step="0.01" value={settings.insurance_rate} onChange={(event) => setSettings({ ...settings, insurance_rate: Number(event.target.value) })} />
            </Field>
            <Field label="Pension Rate">
              <input className="text-input" type="number" step="0.01" value={settings.pension_rate} onChange={(event) => setSettings({ ...settings, pension_rate: Number(event.target.value) })} />
            </Field>
          </div>
          <div className="grid-three">
            <Field label="Annual Leave Days">
              <input className="text-input" type="number" value={settings.annual_leave_days} onChange={(event) => setSettings({ ...settings, annual_leave_days: Number(event.target.value) })} />
            </Field>
            <Field label="Sick Leave Days">
              <input className="text-input" type="number" value={settings.sick_leave_days} onChange={(event) => setSettings({ ...settings, sick_leave_days: Number(event.target.value) })} />
            </Field>
            <Field label="Pay Cycle">
              <select className="select-input" value={settings.pay_cycle} onChange={(event) => setSettings({ ...settings, pay_cycle: event.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
              </select>
            </Field>
          </div>
          <div className="grid-two">
            <Field label="Face Confidence Threshold">
              <input
                className="text-input"
                type="number"
                value={settings.confidence_threshold}
                onChange={(event) => setSettings({ ...settings, confidence_threshold: Number(event.target.value) })}
              />
            </Field>
            <Field label="Kiosk Reset Timer (ms)">
              <input className="text-input" type="number" value={settings.kiosk_reset_timer} onChange={(event) => setSettings({ ...settings, kiosk_reset_timer: Number(event.target.value) })} />
            </Field>
          </div>
        </div>
      </Card>
      </div>
    </AppPageShell>
  );
}
