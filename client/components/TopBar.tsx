"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { clearSession, getRole } from "@/lib/auth";

const titles: Record<string, string> = {
  "/dashboard": "Operations Dashboard",
  "/employees": "Employee Management",
  "/face-registration": "Face Registration",
  "/payroll": "Payroll Processing",
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

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const role = getRole() || "admin";

  return (
    <header className="topbar">
      <div>
        <h1>{titles[pathname] ?? "PulseLedger"}</h1>
        <p>{role === "admin" ? "Payroll operations, attendance, and reporting." : "Personal attendance, leave, and payslips."}</p>
      </div>
      <div className="topbar-actions">
        <div className="role-pill">{role}</div>
        <Button
          tone="secondary"
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
