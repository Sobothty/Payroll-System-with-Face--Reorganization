import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Bell,
  CalendarDays,
  Fingerprint,
  LayoutDashboard,
  MonitorSmartphone,
  ReceiptText,
  Settings2,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

export type AppRole = "admin" | "employee";

export type NavigationItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  external?: boolean;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

type PageMeta = {
  title: string;
  description: string;
};

const adminNavigation: NavigationGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Workforce",
    items: [
      { title: "Employees", url: "/employees", icon: UsersRound },
      { title: "Face Registration", url: "/face-registration", icon: Fingerprint },
      { title: "Attendance Kiosk", url: "http://127.0.0.1:8000/kiosk", icon: MonitorSmartphone, external: true },
    ],
  },
  {
    label: "Payroll",
    items: [
      { title: "Payroll", url: "/payroll", icon: WalletCards },
      { title: "Tax Rules", url: "/tax-rules", icon: BadgePercent },
      { title: "Payslips", url: "/payslips", icon: ReceiptText },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Reports", url: "/reports", icon: CalendarDays },
      { title: "Settings", url: "/settings", icon: Settings2 },
    ],
  },
];

const employeeNavigation: NavigationGroup[] = [
  {
    label: "Self Service",
    items: [
      { title: "Overview", url: "/self-service", icon: LayoutDashboard },
      { title: "Attendance", url: "/self-service/attendance", icon: CalendarDays },
      { title: "Payslips", url: "/self-service/payslips", icon: ReceiptText },
      { title: "Profile", url: "/self-service/profile", icon: UserRound },
      { title: "Notifications", url: "/self-service/notifications", icon: Bell },
    ],
  },
];

const pageMeta: Record<string, PageMeta> = {
  "/dashboard": {
    title: "Operations Dashboard",
    description: "Monitor payroll activity, attendance momentum, and workforce readiness from one overview.",
  },
  "/employees": {
    title: "Employee Management",
    description: "Search, review, and update workforce records before they flow into payroll and attendance.",
  },
  "/face-registration": {
    title: "Face Registration",
    description: "Register or replace biometric profiles for each employee in the current roster.",
  },
  "/payroll": {
    title: "Payroll Processing",
    description: "Guide each payroll run from scope definition to approval without exposing every step at once.",
  },
  "/tax-rules": {
    title: "Tax Rules",
    description: "Maintain brackets, thresholds, and compliance settings used during payroll calculation.",
  },
  "/payslips": {
    title: "Payslips",
    description: "Review generated payslips and export the payroll records employees will receive.",
  },
  "/reports": {
    title: "Reports",
    description: "Inspect historical payroll and attendance trends with export-ready reporting views.",
  },
  "/settings": {
    title: "Settings",
    description: "Configure company profile, attendance policies, and payroll-wide defaults.",
  },
  "/self-service": {
    title: "Employee Overview",
    description: "Track your attendance, upcoming payroll records, and current HR actions in one place.",
  },
  "/self-service/attendance": {
    title: "My Attendance",
    description: "Review recent check-ins, hours worked, and daily attendance history.",
  },
  "/self-service/leave": {
    title: "My Leave",
    description: "Submit leave requests, check balances, and follow approval status from one page.",
  },
  "/self-service/payslips": {
    title: "My Payslips",
    description: "Access current and historical payroll records generated for your account.",
  },
  "/self-service/profile": {
    title: "My Profile",
    description: "Maintain personal account details that support payroll and attendance operations.",
  },
  "/self-service/notifications": {
    title: "Notifications",
    description: "Review payroll, attendance, and HR alerts sent to your employee account.",
  },
};

export function getAppRole(role: string): AppRole {
  return role === "employee" ? "employee" : "admin";
}

export function getNavigation(role: string) {
  return getAppRole(role) === "employee" ? employeeNavigation : adminNavigation;
}

export function getPageMeta(pathname: string, role: string): PageMeta {
  const match = Object.entries(pageMeta)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([route]) => pathname === route || pathname.startsWith(`${route}/`));

  if (match) {
    return match[1];
  }

  return getAppRole(role) === "employee"
    ? pageMeta["/self-service"]
    : {
        title: "PulseLedger",
        description: "Payroll operations, biometric attendance, and workforce reporting.",
      };
}

export function isRouteActive(pathname: string, url: string) {
  if (url === "/self-service") {
    return pathname === url;
  }

  return pathname === url || pathname.startsWith(`${url}/`);
}
