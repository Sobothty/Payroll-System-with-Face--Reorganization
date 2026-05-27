"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearSession, getRole } from "@/lib/auth";

const titles: Record<string, string> = {
  "/dashboard": "Operations Dashboard",
  "/employees": "Employee Management",
  "/face-registration": "Face Registration",
  "/payroll": "Payroll Processing",
  "/tax-rules": "Tax Rules",
  "/payslips": "Payslips",
  "/reports": "Reports",
  "/settings": "Settings",
  "/self-service": "Employee Overview",
  "/self-service/attendance": "My Attendance",
  "/self-service/payslips": "My Payslips",
  "/self-service/leave": "My Leave",
  "/self-service/profile": "My Profile",
  "/self-service/notifications": "Notifications",
};

type TopBarProps = {
  onToggleTheme: () => void;
};

export default function TopBar({ onToggleTheme }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = getRole() || "admin";

  return (
    <header className="topbar flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/90 px-5 py-4 text-card-foreground shadow-sm md:flex-row md:items-center md:justify-between md:px-6">
      <div className="space-y-1">
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.03em]">{titles[pathname] ?? "PulseLedger"}</h1>
        <p className="m-0 text-sm text-muted-foreground">
          {role === "admin" ? "Payroll operations, attendance, and reporting." : "Personal attendance, leave, and payslips."}
        </p>
      </div>
      <div className="topbar-actions flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="role-pill rounded-full px-3 py-1 capitalize">
          {role}
        </Badge>
        <Button variant="outline" onClick={onToggleTheme} aria-label="Toggle color theme">
          Theme
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
