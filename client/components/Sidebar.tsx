"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getRole, getUsername } from "@/lib/auth";

type NavIconName =
  | "dashboard"
  | "employees"
  | "face"
  | "kiosk"
  | "payroll"
  | "tax"
  | "payslip"
  | "reports"
  | "settings"
  | "selfService"
  | "attendance"
  | "leave"
  | "profile"
  | "notifications";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  external?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type IconProps = {
  children: ReactNode;
};

function SidebarIcon({ children }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="sidebar-icon-svg">
      {children}
    </svg>
  );
}

function getNavIcon(icon: NavIconName) {
  switch (icon) {
    case "dashboard":
      return (
        <SidebarIcon>
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </SidebarIcon>
      );
    case "employees":
      return (
        <SidebarIcon>
          <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 19a4.5 4.5 0 0 1 9 0M14 19a3.8 3.8 0 0 1 6.5-2.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SidebarIcon>
      );
    case "face":
      return (
        <SidebarIcon>
          <path d="M8 4H6a2 2 0 0 0-2 2v2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M4 16v2a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 10.5c.7-.8 1.7-1.2 3-1.2s2.3.4 3 1.2M9.5 14.5c.8.8 1.6 1.2 2.5 1.2s1.7-.4 2.5-1.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SidebarIcon>
      );
    case "kiosk":
      return (
        <SidebarIcon>
          <rect x="4" y="4.5" width="16" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 19.5h4M12 15.5v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "payroll":
      return (
        <SidebarIcon>
          <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 10.5h8M8 14.5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "tax":
      return (
        <SidebarIcon>
          <path d="M12 3v18M7.5 7.5c0-1.7 1.8-3 4.5-3s4.5 1.3 4.5 3-1.8 3-4.5 3-4.5 1.3-4.5 3 1.8 3 4.5 3 4.5-1.3 4.5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SidebarIcon>
      );
    case "payslip":
      return (
        <SidebarIcon>
          <path d="M7 4.5h7l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 4.5v4h4M8.5 12h7M8.5 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SidebarIcon>
      );
    case "reports":
      return (
        <SidebarIcon>
          <path d="M6 19V9M12 19V5M18 19v-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4 19.5h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "settings":
      return (
        <SidebarIcon>
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.4 1.4 0 0 1 0 2l-.1.1a1.4 1.4 0 0 1-2 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V19a1.5 1.5 0 0 1-1.5 1.5h-.5A1.5 1.5 0 0 1 10.3 19v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.4 1.4 0 0 1-2 0l-.1-.1a1.4 1.4 0 0 1 0-2l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H5.5A1.5 1.5 0 0 1 4 12.8v-.5A1.5 1.5 0 0 1 5.5 10.8h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.4 1.4 0 0 1 0-2l.1-.1a1.4 1.4 0 0 1 2 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5a1.5 1.5 0 0 1 1.5-1.5h.5A1.5 1.5 0 0 1 13.8 5v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.4 1.4 0 0 1 2 0l.1.1a1.4 1.4 0 0 1 0 2l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.5 1.5 0 0 1 20 12.3v.5a1.5 1.5 0 0 1-1.5 1.5h-.2a1 1 0 0 0-.9.7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </SidebarIcon>
      );
    case "selfService":
      return (
        <SidebarIcon>
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "attendance":
      return (
        <SidebarIcon>
          <rect x="4.5" y="5.5" width="15" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 3.8v3.4M16 3.8v3.4M8 11.5h8M8 15.5h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "leave":
      return (
        <SidebarIcon>
          <path d="M6.5 18.5c5.5-.5 9.5-4.2 11-11-6.8 0-10.5 4-11 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 15.5c1.5-2.1 3.6-3.8 6.5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "profile":
      return (
        <SidebarIcon>
          <circle cx="12" cy="8.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 19a6 6 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarIcon>
      );
    case "notifications":
      return (
        <SidebarIcon>
          <path d="M8 18h8M9 18a3 3 0 0 0 6 0M6.5 15.5h11l-1.3-2.2V10a4.2 4.2 0 1 0-8.4 0v3.3L6.5 15.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </SidebarIcon>
      );
  }
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Workforce",
    items: [
      { href: "/employees", label: "Employees", icon: "employees" },
      { href: "/face-registration", label: "Face Registration", icon: "face" },
      { href: "http://127.0.0.1:8000/kiosk", label: "Attendance Kiosk", icon: "kiosk", external: true },
    ],
  },
  {
    label: "Payroll",
    items: [
      { href: "/payroll", label: "Payroll", icon: "payroll" },
      { href: "/tax-rules", label: "Tax Rules", icon: "tax" },
      { href: "/payslips", label: "Payslips", icon: "payslip" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/reports", label: "Reports", icon: "reports" },
      { href: "/settings", label: "Settings", icon: "settings" },
      { href: "/self-service", label: "Self Service", icon: "selfService" },
    ],
  },
];

const employeeNavGroups: NavGroup[] = [
  {
    label: "Self Service",
    items: [
      { href: "/self-service", label: "Overview", icon: "selfService" },
      { href: "/self-service/attendance", label: "Attendance", icon: "attendance" },
      { href: "/self-service/payslips", label: "Payslips", icon: "payslip" },
      { href: "/self-service/leave", label: "Leave", icon: "leave" },
      { href: "/self-service/profile", label: "Profile", icon: "profile" },
      { href: "/self-service/notifications", label: "Notifications", icon: "notifications" },
    ],
  },
];

function CollapseToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="sidebar-toggle rounded-xl"
      onClick={onClick}
      aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
      title={collapsed ? "Open sidebar" : "Close sidebar"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="sidebar-toggle-icon">
        {collapsed ? (
          <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </Button>
  );
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const role = getRole() || "admin";
  const username = getUsername() || "PulseLedger";
  const filteredGroups = role === "employee" ? employeeNavGroups : navGroups;
  const initials = username.slice(0, 2).toUpperCase();
  const userCardTitle = collapsed ? `${username} (${role})` : undefined;

  return (
    <aside
      className={cn(
        "sidebar flex min-h-screen flex-col border-r border-border/70 bg-sidebar/95 px-3 py-5 text-sidebar-foreground backdrop-blur",
        collapsed ? "w-24" : "w-64 px-4 py-6",
      )}
    >
      <div className="sidebar-header mb-6 flex items-center justify-between gap-3">
        <div className="logo text-xl font-semibold tracking-[-0.03em]" aria-label="PulseLedger">
          {collapsed ? (
            <span className="logo-mark" aria-hidden="true">
              PL
            </span>
          ) : (
            <>
              <span>Pulse</span>
              <strong>Ledger</strong>
            </>
          )}
        </div>
        <CollapseToggle collapsed={collapsed} onClick={onToggleCollapsed} />
      </div>

      <Card
        size="sm"
        className={cn(
          "user-card mb-5 border-sidebar-border/70 bg-sidebar-accent/35 py-0 ring-0",
          collapsed ? "items-center px-0 [&>[data-slot=card-content]]:px-0" : "",
        )}
        title={userCardTitle}
      >
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
          <div className="avatar-circle flex size-10 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-sidebar-foreground ring-1 ring-sidebar-border">
            {initials}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="user-name truncate text-sm font-semibold">{username}</div>
              <div className="user-role truncate text-xs capitalize text-muted-foreground">{role}</div>
            </div>
          ) : null}
        </div>
      </Card>

      {filteredGroups.map((group) => (
        <div key={group.label} className="nav-group mt-4">
          {!collapsed ? (
            <>
              <div className="nav-label mb-2 px-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </div>
              <Separator className="mb-2 bg-sidebar-border/70" />
            </>
          ) : null}
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const classes = cn(
              "nav-item mb-1 flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "active bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
              collapsed && "justify-center px-0",
            );
            const content = (
              <>
                <span className="nav-icon inline-flex size-5 items-center justify-center">{getNavIcon(item.icon)}</span>
                {!collapsed ? <span className="nav-text">{item.label}</span> : null}
              </>
            );

            return item.external ? (
              <a
                key={item.label}
                className={classes}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                {content}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={classes}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
