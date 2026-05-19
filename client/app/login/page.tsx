"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { persistSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error("Invalid credentials");
      const data = await response.json();
      persistSession(data.access_token, data.role, data.username);
      router.push(data.role === "employee" ? "/self-service" : "/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-stage">
      <Card>
        <div className="login-card">
          <div>
            <div className="eyebrow">PulseLedger</div>
            <h1>Secure payroll operations</h1>
            <p>Use the seeded admin account first, then create employee accounts from the workforce module.</p>
          </div>
          <form onSubmit={handleSubmit} className="form-grid">
            <Field label="Username">
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="text-input" />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="text-input"
              />
            </Field>
            {error ? <p className="error-text">{error}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
