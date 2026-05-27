"use client";

import Link from "next/link";

import { getAppRole, getPageMeta } from "@/lib/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageBreadcrumbs({ pathname, role }: { pathname: string; role: string }) {
  const appRole = getAppRole(role);
  const meta = getPageMeta(pathname, role);
  const root = appRole === "employee"
    ? { label: "Overview", href: "/self-service" }
    : { label: "Dashboard", href: "/dashboard" };
  const isRootPage = pathname === root.href;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {isRootPage ? (
            <BreadcrumbPage>{root.label}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href={root.href} />}>{root.label}</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isRootPage ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{meta.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
