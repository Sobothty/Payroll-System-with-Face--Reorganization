"use client";

import { PropsWithChildren, type CSSProperties } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import ToastViewport from "@/components/ui/ToastViewport";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const standalone = pathname === "/login";

  if (standalone) {
    return (
      <div className="login-shell min-h-screen bg-background text-foreground">
        <ToastViewport />
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6">{children}</main>
        <ToastViewport />
      </SidebarInset>
    </SidebarProvider>
  );
}
