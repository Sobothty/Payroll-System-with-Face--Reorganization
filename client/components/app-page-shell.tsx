"use client";

import { ReactNode } from "react";

import { getRole } from "@/lib/auth";
import { getPageMeta } from "@/lib/navigation";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AppPageShellProps = {
  pathname: string;
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function AppPageShell({
  pathname,
  title,
  description,
  toolbar,
  children,
}: AppPageShellProps) {
  const role = getRole() || "admin";
  const meta = getPageMeta(pathname, role);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <SidebarTrigger className="mt-0.5 shrink-0 rounded-md border" />
              <div className="space-y-1">
                <PageBreadcrumbs pathname={pathname} role={role} />
                <h1 className="text-base font-medium">{title ?? meta.title}</h1>
                <p className="text-sm text-muted-foreground">{description ?? meta.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {role}
              </Badge>
              {toolbar}
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
