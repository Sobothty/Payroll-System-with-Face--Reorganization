"use client";

import { BriefcaseBusiness, ShieldCheck, UserRound } from "lucide-react";

import { getAppRole, type AppRole } from "@/lib/navigation";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher({ role }: { role: string }) {
  const appRole: AppRole = getAppRole(role);
  const RoleIcon = appRole === "employee" ? UserRound : ShieldCheck;
  const roleLabel = appRole === "employee" ? "Employee Portal" : "Admin Workspace";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          variant="outline"
          className="h-14 border-sidebar-border/70 bg-sidebar-accent/40"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <BriefcaseBusiness className="size-4" />
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-medium">PulseLedger</span>
            <span className="truncate text-xs text-sidebar-foreground/70">{roleLabel}</span>
          </div>
          <RoleIcon className="size-4 text-sidebar-foreground/70" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

