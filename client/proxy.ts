import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminRoutes = ["/dashboard", "/employees", "/face-registration", "/payroll", "/payslips", "/reports", "/settings"];
const employeeRoutes = ["/self-service"];
const protectedRoutes = [...adminRoutes, ...employeeRoutes];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("pulseledger_token")?.value;
  const role = request.cookies.get("pulseledger_role")?.value;
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!requiresAuth) return NextResponse.next();
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAdminRoute = adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isEmployeeRoute = employeeRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (role === "employee" && isAdminRoute) {
    return NextResponse.redirect(new URL("/self-service", request.url));
  }

  if (role !== "employee" && isEmployeeRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employees/:path*",
    "/face-registration/:path*",
    "/payroll/:path*",
    "/payslips/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/self-service/:path*",
  ],
};
