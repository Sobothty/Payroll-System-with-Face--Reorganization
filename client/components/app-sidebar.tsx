"use client";

import { getRole, getUsername } from "@/lib/auth";
import { getNavigation } from "@/lib/navigation";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const role = getRole() || "admin";
  const username = getUsername() || "admin";
  const groups = getNavigation(role);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher role={role} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={groups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser username={username} role={role} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

