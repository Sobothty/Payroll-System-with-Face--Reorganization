"use client";

import { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const standalone = pathname === "/login";

  if (standalone) {
    return <div className="login-shell">{children}</div>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <TopBar />
        <main className="page-shell">{children}</main>
      </div>
    </div>
  );
}
