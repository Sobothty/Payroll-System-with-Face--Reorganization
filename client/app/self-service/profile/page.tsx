"use client";

import { FormEvent, useEffect, useEffectEvent, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { Button } from "@/components/ui/legacy-button";
import { Card } from "@/components/ui/legacy-card";
import { Field } from "@/components/ui/legacy-field";
import { apiFetch } from "@/lib/api";

const TELEGRAM_CONNECT_TOKEN_KEY = "pulseledger_telegram_connect_token";

type MePayload = {
  username: string;
  must_change_password: boolean;
  employee: {
    full_name: string;
    department: string;
    position: string;
    email: string;
    phone?: string | null;
    telegram_username?: string | null;
    telegram_chat_id?: string | null;
    telegram_notifications_enabled?: boolean;
    hire_date: string;
  } | null;
};

export default function SelfServiceProfilePage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [profile, setProfile] = useState({
    email: "",
    phone: "",
    telegram_notifications_enabled: false,
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "" });
  const [botUsername, setBotUsername] = useState("");
  const [telegramStatus, setTelegramStatus] = useState("");
  const [connectToken, setConnectToken] = useState("");
  const [connectStatus, setConnectStatus] = useState<"idle" | "pending" | "connected">("idle");

  async function load() {
    const [meRes, telegramMeta] = await Promise.all([
      apiFetch<MePayload>("/api/auth/me"),
      apiFetch<{ bot_username: string }>("/api/self-service/telegram/meta"),
    ]);
    setMe(meRes);
    setBotUsername(telegramMeta.bot_username);
    setProfile({
      email: meRes.employee?.email ?? "",
      phone: meRes.employee?.phone ?? "",
      telegram_notifications_enabled: meRes.employee?.telegram_notifications_enabled ?? false,
    });
    if (meRes.employee?.telegram_chat_id) {
      setConnectStatus("connected");
      setConnectToken("");
      window.localStorage.removeItem(TELEGRAM_CONNECT_TOKEN_KEY);
      return;
    }

    const storedToken = window.localStorage.getItem(TELEGRAM_CONNECT_TOKEN_KEY) ?? "";
    if (storedToken) {
      setConnectToken(storedToken);
      setConnectStatus("pending");
      return;
    }

    setConnectStatus("idle");
  }

  async function checkTelegramStatus(silent = false) {
    if (!connectToken) return;
    try {
      const result = await apiFetch<{ status: string; telegram_username?: string | null }>(`/api/telegram/connect/${connectToken}`, {
        notifyOnError: !silent,
      });
      if (result.status === "connected") {
        setConnectStatus("connected");
        setConnectToken("");
        window.localStorage.removeItem(TELEGRAM_CONNECT_TOKEN_KEY);
        setTelegramStatus(`Telegram connected${result.telegram_username ? ` as @${result.telegram_username}` : ""}.`);
        await load();
      } else if (!silent) {
        setTelegramStatus("Waiting for Telegram bot confirmation.");
      }
    } catch {
      // Toast is shown by apiFetch unless this was a silent poll.
    }
  }

  const pollTelegramStatus = useEffectEvent(() => {
    checkTelegramStatus(true).catch(() => undefined);
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [meRes, telegramMeta] = await Promise.all([
          apiFetch<MePayload>("/api/auth/me"),
          apiFetch<{ bot_username: string }>("/api/self-service/telegram/meta"),
        ]);

        if (cancelled) {
          return;
        }

        setMe(meRes);
        setBotUsername(telegramMeta.bot_username);
        setProfile({
          email: meRes.employee?.email ?? "",
          phone: meRes.employee?.phone ?? "",
          telegram_notifications_enabled: meRes.employee?.telegram_notifications_enabled ?? false,
        });

        if (meRes.employee?.telegram_chat_id) {
          setConnectStatus("connected");
          setConnectToken("");
          window.localStorage.removeItem(TELEGRAM_CONNECT_TOKEN_KEY);
          return;
        }

        const storedToken = window.localStorage.getItem(TELEGRAM_CONNECT_TOKEN_KEY) ?? "";
        if (storedToken) {
          setConnectToken(storedToken);
          setConnectStatus("pending");
          return;
        }

        setConnectStatus("idle");
      } catch {
        // Toast is shown by apiFetch.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (connectStatus !== "pending" || !connectToken) return;

    const intervalId = window.setInterval(() => {
      pollTelegramStatus();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [connectStatus, connectToken]);

  async function saveProfile() {
    await apiFetch("/api/employees/me/profile", { method: "PATCH", body: JSON.stringify(profile) });
    setTelegramStatus("Profile updated.");
    await load();
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify(passwordForm) });
    setPasswordForm({ current_password: "", new_password: "" });
    await load();
  }

  async function sendTelegramTest() {
    try {
      const result = await apiFetch<{ status: string }>("/api/self-service/telegram/test", { method: "POST" });
      setTelegramStatus(result.status === "sent" ? "Telegram test message sent." : "Telegram test did not send.");
    } catch {
      // Toast is shown by apiFetch.
    }
  }

  async function connectTelegram() {
    try {
      const result = await apiFetch<{ start_token: string; connect_url: string }>("/api/telegram/connect", { method: "POST" });
      setConnectToken(result.start_token);
      setConnectStatus("pending");
      window.localStorage.setItem(TELEGRAM_CONNECT_TOKEN_KEY, result.start_token);
      window.open(result.connect_url, "_blank", "noopener,noreferrer");
      setTelegramStatus("Telegram connect started. Press Start in Telegram. This page will link automatically.");
    } catch {
      // Toast is shown by apiFetch.
    }
  }

  async function disconnectTelegram() {
    try {
      await apiFetch("/api/telegram/disconnect", { method: "POST" });
      setConnectStatus("idle");
      setConnectToken("");
      window.localStorage.removeItem(TELEGRAM_CONNECT_TOKEN_KEY);
      setTelegramStatus("Telegram disconnected.");
      await load();
    } catch {
      // Toast is shown by apiFetch.
    }
  }

  return (
    <AppPageShell pathname="/self-service/profile">
      <div className="form-grid px-4 lg:px-6">
      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Profile</h2>
            <p className="table-subcopy">{me?.employee?.full_name} · {me?.employee?.department} · {me?.employee?.position}</p>
          </div>
          <Button type="button" onClick={saveProfile}>Update Profile</Button>
        </div>
        <div className="grid-two">
          <Field label="Email">
            <input className="text-input" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="text-input" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
          </Field>
        </div>
        <div className="grid-two" style={{ marginTop: 16 }}>
          <Field label="Telegram Notifications">
            <label className="role-pill" style={{ gap: 10 }}>
              <input
                type="checkbox"
                checked={profile.telegram_notifications_enabled}
                onChange={(event) => setProfile({ ...profile, telegram_notifications_enabled: event.target.checked })}
              />
              Enable push to Telegram
            </label>
          </Field>
          <Field label="Bot Setup">
            <div className="form-grid">
              <div className="helper-text">
                Click connect, then press Start in Telegram with {botUsername ? `@${botUsername}` : "the configured bot"}. Once the bot receives the start token, this page will connect automatically.
              </div>
              <div className="action-row">
                <Button type="button" tone="secondary" onClick={connectTelegram}>Connect Telegram</Button>
                {me?.employee?.telegram_chat_id ? <Button type="button" tone="danger" onClick={disconnectTelegram}>Disconnect</Button> : null}
                {me?.employee?.telegram_chat_id ? <Button type="button" tone="secondary" onClick={sendTelegramTest}>Send Test</Button> : null}
              </div>
              <div className="helper-text">
                Status: {me?.employee?.telegram_chat_id ? `Connected${me.employee.telegram_username ? ` as @${me.employee.telegram_username}` : ""}` : connectStatus === "pending" ? "Waiting for Telegram start confirmation" : "Not connected"}
              </div>
            </div>
          </Field>
        </div>
        {telegramStatus ? <div className="feedback-banner success" style={{ marginTop: 16 }}>{telegramStatus}</div> : null}
      </Card>

      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Password</h2>
            <p className="table-subcopy">{me?.must_change_password ? "Temporary password must be replaced." : "Change your password at any time."}</p>
          </div>
        </div>
        <form className="grid-two" onSubmit={savePassword}>
          <Field label="Current Password">
            <input className="text-input" type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm((state) => ({ ...state, current_password: event.target.value }))} />
          </Field>
          <Field label="New Password">
            <input className="text-input" type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((state) => ({ ...state, new_password: event.target.value }))} />
          </Field>
          <Button type="submit">Change Password</Button>
        </form>
      </Card>
      </div>
    </AppPageShell>
  );
}
