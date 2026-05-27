"use client";

import { usePathname } from "next/navigation";

import { getRole } from "@/lib/auth";
import { getPageMeta } from "@/lib/navigation";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  const pathname = usePathname();
  const role = getRole() || "admin";
  const meta = getPageMeta(pathname, role);

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />
        <div className="min-w-0 flex-1">
          <PageBreadcrumbs pathname={pathname} role={role} />
          <div className="truncate text-sm font-medium">{meta.title}</div>
          <div className="truncate text-xs text-muted-foreground">{meta.description}</div>
        </div>
        <Badge variant="outline" className="hidden capitalize sm:inline-flex">
          {role}
        </Badge>
      </div>
    </header>
  );
}
