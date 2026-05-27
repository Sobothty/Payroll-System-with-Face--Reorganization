"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, ShieldCheck, WalletCards } from "lucide-react";

import { cn } from "@/lib/utils";
import { persistSession } from "@/lib/auth";
import { showErrorToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/backend/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      persistSession(data.access_token, data.role, data.username);
      router.push(data.role === "employee" ? "/self-service" : "/dashboard");
    } catch (submitError) {
      showErrorToast(submitError instanceof Error ? submitError.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  PulseLedger
                </div>
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Sign in to continue managing payroll, attendance, and biometric operations.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <span className="ml-auto text-xs text-muted-foreground">Seeded admin password: admin123</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Login"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Default access
              </FieldSeparator>
              <Field className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-left">
                  <WalletCards className="mb-2 size-4 text-primary" />
                  <div className="text-sm font-medium">Payroll</div>
                  <div className="text-xs text-muted-foreground">Run salaries and review totals.</div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-left">
                  <Fingerprint className="mb-2 size-4 text-primary" />
                  <div className="text-sm font-medium">Attendance</div>
                  <div className="text-xs text-muted-foreground">Track daily biometric activity.</div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-left">
                  <ShieldCheck className="mb-2 size-4 text-primary" />
                  <div className="text-sm font-medium">Admin</div>
                  <div className="text-xs text-muted-foreground">Use seeded credentials on first sign-in.</div>
                </div>
              </Field>
            </FieldGroup>
          </form>

          <div className="relative hidden min-h-full bg-muted md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_45%),linear-gradient(160deg,rgba(15,23,42,0.98),rgba(17,24,39,0.88))]" />
            <div className="relative flex h-full flex-col justify-between p-8 text-white">
              <div>
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                  Secure operations
                </div>
                <h2 className="mt-6 max-w-xs text-3xl font-semibold tracking-tight">
                  Payroll and attendance in one operating system
                </h2>
                <p className="mt-3 max-w-sm text-sm text-white/70">
                  PulseLedger keeps workforce records, biometric readiness, and payroll processing aligned in one admin surface.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/55">Command Center</div>
                  <div className="mt-2 text-lg font-medium">Overview, employees, and payroll all share one shell.</div>
                </div>
                <FieldDescription className="px-1 text-white/70">
                  By continuing, you use the local PulseLedger environment configured for this workspace.
                </FieldDescription>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
