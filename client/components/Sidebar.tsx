"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getRole, getUsername } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  external?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Workforce",
    items: [
      { href: "/employees", label: "Employees" },
      { href: "/face-registration", label: "Face Registration" },
      { href: "http://127.0.0.1:8000/kiosk", label: "Attendance Kiosk", external: true },
    ],
  },
  {
    label: "Payroll",
    items: [
      { href: "/payroll", label: "Payroll" },
      { href: "/payslips", label: "Payslips" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/reports", label: "Reports" },
      { href: "/settings", label: "Settings" },
      { href: "/self-service", label: "Self Service" },
    ],
  },
];

const employeeNavGroups: NavGroup[] = [
  {
    label: "Self Service",
    items: [
      { href: "/self-service", label: "Overview" },
      { href: "/self-service/attendance", label: "Attendance" },
      { href: "/self-service/payslips", label: "Payslips" },
      { href: "/self-service/leave", label: "Leave" },
      { href: "/self-service/profile", label: "Profile" },
      { href: "/self-service/notifications", label: "Notifications" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const role = getRole() || "admin";
  const username = getUsername() || "PulseLedger";
  const filteredGroups = role === "employee" ? employeeNavGroups : navGroups;

  return (
    <aside className="sidebar">
      <div className="logo">
        <span>Pulse</span>
        <strong>Ledger</strong>
      </div>
      <div className="user-card">
        <div className="avatar-circle">{username.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="user-name">{username}</div>
          <div className="user-role">{role}</div>
        </div>
      </div>
      {filteredGroups.map((group) => (
        <div key={group.label} className="nav-group">
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) =>
            item.external ? (
              <a key={item.label} className="nav-item" href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      ))}
    </aside>
  );
}
