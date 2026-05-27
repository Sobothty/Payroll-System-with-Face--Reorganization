"use client";

import { useMemo, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EmployeeDirectoryRow = {
  id: string;
  name: string;
  employeeId: string;
  department: "Operations" | "Engineering" | "HR" | "Finance";
  position: string;
  phone: string;
  faceStatus: "Registered" | "Missing";
  status: "Active" | "Inactive";
  joinedDate: string;
  profileComplete: boolean;
};

const employeeDirectory: EmployeeDirectoryRow[] = [
  {
    id: "1",
    name: "Dara Sok",
    employeeId: "EMP-001",
    department: "Operations",
    position: "Operations Staff",
    phone: "+855 12 345 678",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-01-10",
    profileComplete: true,
  },
  {
    id: "2",
    name: "Sokha Kim",
    employeeId: "EMP-002",
    department: "Engineering",
    position: "Frontend Developer",
    phone: "+855 15 222 333",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-01-15",
    profileComplete: true,
  },
  {
    id: "3",
    name: "Lina Chan",
    employeeId: "EMP-003",
    department: "HR",
    position: "HR Officer",
    phone: "+855 10 888 999",
    faceStatus: "Missing",
    status: "Active",
    joinedDate: "2026-02-01",
    profileComplete: false,
  },
  {
    id: "4",
    name: "Vanna Chea",
    employeeId: "EMP-004",
    department: "Finance",
    position: "Finance Officer",
    phone: "+855 17 777 111",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-02-05",
    profileComplete: true,
  },
  {
    id: "5",
    name: "Rithy Mean",
    employeeId: "EMP-005",
    department: "Operations",
    position: "Shift Coordinator",
    phone: "+855 11 234 567",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-02-09",
    profileComplete: true,
  },
  {
    id: "6",
    name: "Malis Pich",
    employeeId: "EMP-006",
    department: "Operations",
    position: "Logistics Officer",
    phone: "+855 16 345 210",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-02-18",
    profileComplete: true,
  },
  {
    id: "7",
    name: "Mony Rath",
    employeeId: "EMP-007",
    department: "Operations",
    position: "Warehouse Assistant",
    phone: "+855 96 110 220",
    faceStatus: "Missing",
    status: "Active",
    joinedDate: "2026-02-25",
    profileComplete: false,
  },
  {
    id: "8",
    name: "Srey Pov",
    employeeId: "EMP-008",
    department: "Operations",
    position: "Operations Supervisor",
    phone: "+855 98 321 456",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-03-01",
    profileComplete: true,
  },
  {
    id: "9",
    name: "Piseth Khou",
    employeeId: "EMP-009",
    department: "Operations",
    position: "Inventory Analyst",
    phone: "+855 70 555 901",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-03-04",
    profileComplete: true,
  },
  {
    id: "10",
    name: "Nary Touch",
    employeeId: "EMP-010",
    department: "Operations",
    position: "Quality Control Officer",
    phone: "+855 87 991 114",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-03-09",
    profileComplete: true,
  },
  {
    id: "11",
    name: "Kosal Eng",
    employeeId: "EMP-011",
    department: "Engineering",
    position: "Backend Developer",
    phone: "+855 93 214 556",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-03-14",
    profileComplete: true,
  },
  {
    id: "12",
    name: "Dalin Ouk",
    employeeId: "EMP-012",
    department: "Engineering",
    position: "UI Engineer",
    phone: "+855 92 745 333",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-03-20",
    profileComplete: true,
  },
  {
    id: "13",
    name: "Chenda Lim",
    employeeId: "EMP-013",
    department: "HR",
    position: "Recruitment Specialist",
    phone: "+855 81 004 662",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-03-26",
    profileComplete: true,
  },
  {
    id: "14",
    name: "Vicheka Hor",
    employeeId: "EMP-014",
    department: "Finance",
    position: "Accountant",
    phone: "+855 99 876 211",
    faceStatus: "Registered",
    status: "Active",
    joinedDate: "2026-04-02",
    profileComplete: true,
  },
];

const departmentOptions = ["Operations", "Engineering", "HR", "Finance"] as const;
const faceStatusOptions = ["Registered", "Missing"] as const;
const employmentStatusOptions = ["Active", "Inactive"] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function FaceStatusBadge({ value }: { value: EmployeeDirectoryRow["faceStatus"] }) {
  if (value === "Registered") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
        Registered
      </Badge>
    );
  }

  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
      Missing
    </Badge>
  );
}

function EmploymentStatusBadge({ value }: { value: EmployeeDirectoryRow["status"] }) {
  if (value === "Active") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
        Active
      </Badge>
    );
  }

  return (
    <Badge className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300">
        Inactive
      </Badge>
  );
}

export default function EmployeesPage() {
  const [filters, setFilters] = useState({
    search: "",
    department: "all",
    faceStatus: "all",
    employmentStatus: "all",
  });

  const totalEmployees = employeeDirectory.length;
  const activeEmployees = employeeDirectory.filter((employee) => employee.status === "Active").length;
  const registeredFaces = employeeDirectory.filter((employee) => employee.faceStatus === "Registered").length;
  const completeProfiles = employeeDirectory.filter((employee) => employee.profileComplete).length;
  const missingProfiles = employeeDirectory.filter((employee) => !employee.profileComplete || employee.faceStatus === "Missing").length;
  const readyForAttendance = employeeDirectory.filter(
    (employee) => employee.status === "Active" && employee.faceStatus === "Registered",
  ).length;
  const faceCoverage = Math.round((registeredFaces / totalEmployees) * 100);

  const departmentDistribution = useMemo(
    () =>
      departmentOptions.map((department) => {
        const count = employeeDirectory.filter((employee) => employee.department === department).length;
        const percent = Math.round((count / totalEmployees) * 100);

        return { department, count, percent };
      }),
    [totalEmployees],
  );

  const filteredEmployees = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();

    return employeeDirectory.filter((employee) => {
      const matchesSearch =
        !searchValue ||
        employee.name.toLowerCase().includes(searchValue) ||
        employee.employeeId.toLowerCase().includes(searchValue);
      const matchesDepartment = filters.department === "all" || employee.department === filters.department;
      const matchesFaceStatus = filters.faceStatus === "all" || employee.faceStatus === filters.faceStatus;
      const matchesEmploymentStatus =
        filters.employmentStatus === "all" || employee.status === filters.employmentStatus;

      return matchesSearch && matchesDepartment && matchesFaceStatus && matchesEmploymentStatus;
    });
  }, [filters]);

  const summaryCards = [
    {
      title: "Total Employees",
      value: totalEmployees.toLocaleString(),
      description: "Active employees in the directory",
    },
    {
      title: "Active Employees",
      value: activeEmployees.toLocaleString(),
      description: "100% currently active",
    },
    {
      title: "Face Registered",
      value: `${registeredFaces} / ${totalEmployees}`,
      description: `${faceCoverage}% biometric profile coverage`,
    },
    {
      title: "Departments",
      value: departmentDistribution.length.toLocaleString(),
      description: "Operations, Engineering, HR, Finance",
    },
  ];

  const overviewItems = [
    {
      title: "Directory Status",
      value: "Open",
      description: "Employee records are available for admin management",
    },
    {
      title: "Profile Completion",
      value: `${Math.round((completeProfiles / totalEmployees) * 100)}%`,
      description: "12 employees have complete required profiles",
    },
    {
      title: "Face Registration",
      value: `${registeredFaces} ready`,
      description: "2 employees still need face registration",
    },
    {
      title: "Attendance Readiness",
      value: "Ready",
      description: "Registered employees can be used for attendance tracking",
    },
  ];

  const readinessItems = [
    { label: "Complete Profiles", value: completeProfiles.toLocaleString() },
    { label: "Missing Face Registration", value: missingProfiles.toLocaleString() },
    { label: "Active Status", value: activeEmployees.toLocaleString() },
    { label: "Ready for Attendance", value: readyForAttendance.toLocaleString() },
  ];

  return (
    <AppPageShell
      pathname="/employees"
      title="Employee Management"
      description="Manage employee records, department assignments, attendance readiness, and profile status from one place."
      toolbar={
        <>
          <Button type="button" onClick={() => console.log("Add employee")}>
            Add Employee
          </Button>
          <Button type="button" variant="outline" onClick={() => console.log("Import employees")}>
            Import Employees
          </Button>
          <Button type="button" variant="outline" onClick={() => console.log("Export employee list")}>
            Export List
          </Button>
        </>
      }
    >
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card">
            <CardHeader className="space-y-2">
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">{card.description}</CardContent>
          </Card>
        ))}
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-4 border-b">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Workforce overview</CardTitle>
                <CardDescription>
                  Review employee distribution, profile readiness, and department coverage before managing individual records.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{totalEmployees} employees</Badge>
                <Badge variant="outline">{registeredFaces} face ready</Badge>
                <Badge variant="outline">{departmentDistribution.length} departments</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                {overviewItems.map((item) => (
                  <div key={item.title} className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-sm font-medium text-muted-foreground">{item.title}</div>
                    <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{item.description}</div>
                  </div>
                ))}
              </div>

              <Card className="border-dashed shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Department Distribution</CardTitle>
                  <CardDescription>Department coverage across the current employee directory.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {departmentDistribution.map((item) => (
                    <div key={item.department} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{item.department}</div>
                          <div className="text-sm text-muted-foreground">{item.count} employees</div>
                        </div>
                        <Badge variant="outline">{item.percent}%</Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-300"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Employee readiness</CardTitle>
                <CardDescription>Quick action-oriented view of which employees still need admin attention.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-lg font-semibold tabular-nums">{item.value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-4 border-b">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Employee directory</CardTitle>
                <CardDescription>
                  Search the roster, review profile readiness, and trigger admin actions for individual employees.
                </CardDescription>
              </div>
              <Badge variant="outline">{filteredEmployees.length} visible employees</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="employee-search">Search</Label>
                <Input
                  id="employee-search"
                  placeholder="Search by employee name or ID"
                  value={filters.search}
                  onChange={(event) => setFilters((state) => ({ ...state, search: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-department">Department</Label>
                <Select
                  value={filters.department}
                  onValueChange={(value) => setFilters((state) => ({ ...state, department: value ?? "all" }))}
                >
                  <SelectTrigger id="employee-department" className="w-full">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departmentOptions.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-face-status">Face status</Label>
                <Select
                  value={filters.faceStatus}
                  onValueChange={(value) => setFilters((state) => ({ ...state, faceStatus: value ?? "all" }))}
                >
                  <SelectTrigger id="employee-face-status" className="w-full">
                    <SelectValue placeholder="All face status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All face status</SelectItem>
                    {faceStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-employment-status">Employment status</Label>
                <Select
                  value={filters.employmentStatus}
                  onValueChange={(value) => setFilters((state) => ({ ...state, employmentStatus: value ?? "all" }))}
                >
                  <SelectTrigger id="employee-employment-status" className="w-full">
                    <SelectValue placeholder="All employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employment status</SelectItem>
                    {employmentStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Face Status</TableHead>
                    <TableHead>Employment Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="pr-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length ? (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="pl-4">
                          <div className="flex min-w-[220px] items-center gap-3">
                            <div className="employee-avatar">{getInitials(employee.name)}</div>
                            <div className="space-y-1">
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-xs text-muted-foreground">{employee.position}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.employeeId}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal text-muted-foreground">{employee.position}</TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>
                          <FaceStatusBadge value={employee.faceStatus} />
                        </TableCell>
                        <TableCell>
                          <EmploymentStatusBadge value={employee.status} />
                        </TableCell>
                        <TableCell>{formatDate(employee.joinedDate)}</TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => console.log("View employee", employee)}>
                              View
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => console.log("Edit employee", employee)}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" onClick={() => console.log("Register face", employee)}>
                              Register Face
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="px-4 py-10 text-center">
                        <div className="space-y-1">
                          <h3 className="font-medium">No employees match this filter</h3>
                          <p className="text-sm text-muted-foreground">
                            Adjust search or filter selections to broaden the directory view.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
