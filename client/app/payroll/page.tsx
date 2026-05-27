"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CircleHelp,
  Download,
  MoonStar,
  Save,
  SunMedium,
} from "lucide-react";

import { getPreferredTheme, persistTheme, type ThemeMode } from "@/lib/theme";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type PayrollStep = 1 | 2 | 3 | 4;

type PreviewEmployee = {
  name: string;
  department: "Operations" | "Engineering" | "HR" | "Finance";
  grossSalary: string;
  deduction: string;
  netSalary: string;
  status: "Ready" | "Needs Review";
};

type ReviewEmployee = {
  name: string;
  employeeId: string;
  department: "Operations" | "Engineering" | "HR" | "Finance";
  baseSalary: string;
  overtime: string;
  bonus: string;
  deduction: string;
  grossSalary: string;
  netSalary: string;
  status: "Ready" | "Needs Review";
};

type AdjustmentType = "Bonus" | "Deduction" | "Correction";

type AdjustmentForm = {
  adjustmentType: AdjustmentType;
  amount: string;
  reason: string;
};

const wizardSteps: Array<{ id: PayrollStep; label: string }> = [
  { id: 1, label: "Configure Payroll" },
  { id: 2, label: "Generate Preview" },
  { id: 3, label: "Review & Adjust" },
  { id: 4, label: "Finalize Payroll" },
];

const previewEmployees: PreviewEmployee[] = [
  {
    name: "Dara Sok",
    department: "Operations",
    grossSalary: "KHR 4,300,000",
    deduction: "KHR 50,000",
    netSalary: "KHR 4,250,000",
    status: "Ready",
  },
  {
    name: "Sokha Kim",
    department: "Engineering",
    grossSalary: "KHR 5,200,000",
    deduction: "KHR 100,000",
    netSalary: "KHR 5,100,000",
    status: "Ready",
  },
  {
    name: "Lina Chan",
    department: "HR",
    grossSalary: "KHR 3,600,000",
    deduction: "KHR 50,000",
    netSalary: "KHR 3,550,000",
    status: "Needs Review",
  },
  {
    name: "Vanna Chea",
    department: "Finance",
    grossSalary: "KHR 4,850,000",
    deduction: "KHR 0",
    netSalary: "KHR 4,850,000",
    status: "Ready",
  },
];

const reviewEmployees: ReviewEmployee[] = [
  {
    name: "Dara Sok",
    employeeId: "EMP-001",
    department: "Operations",
    baseSalary: "KHR 4,000,000",
    overtime: "KHR 200,000",
    bonus: "KHR 100,000",
    deduction: "KHR 50,000",
    grossSalary: "KHR 4,300,000",
    netSalary: "KHR 4,250,000",
    status: "Ready",
  },
  {
    name: "Sokha Kim",
    employeeId: "EMP-002",
    department: "Engineering",
    baseSalary: "KHR 5,000,000",
    overtime: "KHR 0",
    bonus: "KHR 200,000",
    deduction: "KHR 100,000",
    grossSalary: "KHR 5,200,000",
    netSalary: "KHR 5,100,000",
    status: "Ready",
  },
  {
    name: "Lina Chan",
    employeeId: "EMP-003",
    department: "HR",
    baseSalary: "KHR 3,500,000",
    overtime: "KHR 100,000",
    bonus: "KHR 0",
    deduction: "KHR 50,000",
    grossSalary: "KHR 3,600,000",
    netSalary: "KHR 3,550,000",
    status: "Needs Review",
  },
  {
    name: "Vanna Chea",
    employeeId: "EMP-004",
    department: "Finance",
    baseSalary: "KHR 4,500,000",
    overtime: "KHR 250,000",
    bonus: "KHR 100,000",
    deduction: "KHR 0",
    grossSalary: "KHR 4,850,000",
    netSalary: "KHR 4,850,000",
    status: "Ready",
  },
];

function StatusBadge({ value }: { value: "Draft" | "Ready" | "Needs Review" | "Finalized" | "Locked" }) {
  const className =
    value === "Ready" || value === "Finalized"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
      : value === "Needs Review"
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
        : value === "Locked"
          ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300"
          : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300";

  return <Badge className={className}>{value}</Badge>;
}

function PayrollMetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card">
      <CardHeader className="space-y-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  );
}

function StepCircle({
  step,
  currentStep,
}: {
  step: { id: PayrollStep; label: string };
  currentStep: PayrollStep;
}) {
  const isActive = step.id === currentStep;
  const isComplete = step.id < currentStep;

  return (
    <div className="relative z-10 flex flex-col items-center gap-3 text-center">
      <div
        className={[
          "flex size-11 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200",
          isComplete
            ? "border-primary bg-primary text-primary-foreground"
            : isActive
              ? "scale-105 border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-background text-muted-foreground",
        ].join(" ")}
      >
        {isComplete ? <Check className="size-4" /> : `0${step.id}`}
      </div>
      <div className={isActive ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground"}>{step.label}</div>
    </div>
  );
}

export default function PayrollPage() {
  const [theme, setTheme] = useState<ThemeMode>(getPreferredTheme);
  const [currentStep, setCurrentStep] = useState<PayrollStep>(1);
  const [selectedEmployee, setSelectedEmployee] = useState<ReviewEmployee | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [periodStart, setPeriodStart] = useState("2026-05-01");
  const [periodEnd, setPeriodEnd] = useState("2026-05-31");
  const [payCycle, setPayCycle] = useState("Monthly");
  const [currency, setCurrency] = useState("KHR");
  const [departmentScope, setDepartmentScope] = useState("All departments");
  const [employeeStatus, setEmployeeStatus] = useState("Active employees only");
  const [correctionRun, setCorrectionRun] = useState("No");
  const [includeAttendance, setIncludeAttendance] = useState("Yes");
  const [reviewFilters, setReviewFilters] = useState({
    search: "",
    department: "all",
    status: "all",
  });
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>({
    adjustmentType: "Bonus",
    amount: "",
    reason: "",
  });

  const progressWidth = `${((currentStep - 1) / (wizardSteps.length - 1)) * 100}%`;

  const filteredReviewEmployees = useMemo(() => {
    const searchValue = reviewFilters.search.trim().toLowerCase();

    return reviewEmployees.filter((employee) => {
      const matchesSearch =
        !searchValue ||
        employee.name.toLowerCase().includes(searchValue) ||
        employee.employeeId.toLowerCase().includes(searchValue);
      const matchesDepartment = reviewFilters.department === "all" || employee.department === reviewFilters.department;
      const matchesStatus = reviewFilters.status === "all" || employee.status === reviewFilters.status;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [reviewFilters]);

  function goToStep(step: PayrollStep) {
    setCurrentStep(step);
  }

  function handlePrimaryAction() {
    if (currentStep === 1) {
      console.log("Generate payroll preview");
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }

    setIsFinalizeOpen(true);
  }

  function handleBackAction() {
    if (currentStep === 1) {
      return;
    }

    setCurrentStep((currentStep - 1) as PayrollStep);
  }

  function handleOpenAdjustment(employee: ReviewEmployee) {
    setSelectedEmployee(employee);
    setAdjustmentForm({
      adjustmentType: "Bonus",
      amount: "",
      reason: "",
    });
    setIsAdjustmentOpen(true);
  }

  function handleSaveAdjustment() {
    console.log("Save payroll adjustment", {
      employee: selectedEmployee,
      adjustment: adjustmentForm,
    });
    setIsAdjustmentOpen(false);
  }

  function handleConfirmFinalize() {
    console.log("Finalize payroll");
    setIsFinalizeOpen(false);
    setIsFinalized(true);
  }

  return (
    <>
      <AppPageShell
        pathname="/payroll"
        title="Payroll Processing"
        description="Configure payroll, generate a preview, review employee salary details, and finalize payroll safely."
        toolbar={
          <>
            <Button type="button" variant="outline" onClick={() => console.log("Save payroll draft")}>
              <Save className="size-4" />
              Save Draft
            </Button>
            <Button type="button" variant="outline" onClick={() => console.log("Export payroll preview")}>
              <Download className="size-4" />
              Export Preview
            </Button>
            <Button type="button" variant="outline" onClick={() => console.log("Open payroll help")}>
              <CircleHelp className="size-4" />
              Help
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                persistTheme(nextTheme);
                setTheme(nextTheme);
              }}
            >
              {theme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Button>
          </>
        }
      >
        <div className="space-y-5 px-4 pb-28 lg:px-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Payroll progress</CardTitle>
              <CardDescription>Follow the wizard from configuration to final payroll lock with a clear next action.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative">
                <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
                <div
                  className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-300"
                  style={{ width: progressWidth }}
                />
                <div className="relative grid gap-6 md:grid-cols-4">
                  {wizardSteps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      className="group"
                      onClick={() => goToStep(step.id)}
                    >
                      <StepCircle step={step} currentStep={currentStep} />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="transition-all duration-200">
            {currentStep === 1 ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Step 1: Configure Payroll</CardTitle>
                  <CardDescription>
                    Choose the payroll period, department scope, and run options before generating the payroll preview.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Payroll Period</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="period-start">Period Start</Label>
                          <Input id="period-start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="period-end">Period End</Label>
                          <Input id="period-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pay-cycle">Pay Cycle</Label>
                          <Select value={payCycle} onValueChange={(value) => setPayCycle(value ?? "Monthly")}>
                            <SelectTrigger id="pay-cycle" className="w-full">
                              <SelectValue placeholder="Select pay cycle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                              <SelectItem value="Weekly">Weekly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select value={currency} onValueChange={(value) => setCurrency(value ?? "KHR")}>
                            <SelectTrigger id="currency" className="w-full">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="KHR">KHR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Scope</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="department-scope">Department Scope</Label>
                          <Select value={departmentScope} onValueChange={(value) => setDepartmentScope(value ?? "All departments")}>
                            <SelectTrigger id="department-scope" className="w-full">
                              <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All departments">All departments</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                              <SelectItem value="Engineering">Engineering</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employee-status">Employee Status</Label>
                          <Select value={employeeStatus} onValueChange={(value) => setEmployeeStatus(value ?? "Active employees only")}>
                            <SelectTrigger id="employee-status" className="w-full">
                              <SelectValue placeholder="Select employee status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active employees only">Active employees only</SelectItem>
                              <SelectItem value="All employees">All employees</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="correction-run">Correction Run</Label>
                          <Select value={correctionRun} onValueChange={(value) => setCorrectionRun(value ?? "No")}>
                            <SelectTrigger id="correction-run" className="w-full">
                              <SelectValue placeholder="Select correction run" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="Yes">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="include-attendance">Include Attendance</Label>
                          <Select value={includeAttendance} onValueChange={(value) => setIncludeAttendance(value ?? "Yes")}>
                            <SelectTrigger id="include-attendance" className="w-full">
                              <SelectValue placeholder="Select attendance option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <PayrollMetricCard title="Employees in Scope" value="14" description="Active employees matched this scope" />
                    <PayrollMetricCard title="Attendance Ready" value="12 / 14" description="2 employees need attendance review" />
                    <PayrollMetricCard title="Salary Setup" value="14 / 14" description="All employees have salary setup" />
                    <PayrollMetricCard title="Ready to Preview" value="Yes" description="Payroll preview can be generated" />
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    2 employees have attendance records that need review before finalization. You can still generate a preview.
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={handlePrimaryAction}>
                      Generate Payroll Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {currentStep === 2 ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Step 2: Generate Preview</CardTitle>
                  <CardDescription>
                    Review the generated payroll totals before checking individual employee records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <PayrollMetricCard title="Employees Included" value="14" description="Included in this payroll preview" />
                    <PayrollMetricCard title="Gross Payroll" value="KHR 65,770,000" description="Total before deductions" />
                    <PayrollMetricCard title="Total Deductions" value="KHR 4,270,000" description="Attendance, tax, and other deductions" />
                    <PayrollMetricCard title="Net Payroll" value="KHR 61,500,000" description="Final amount projected for payout" />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Payroll calculation breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {[
                          ["Base Salary Total", "KHR 58,000,000"],
                          ["Overtime Total", "KHR 3,200,000"],
                          ["Bonus / Allowance", "KHR 4,570,000"],
                          ["Total Deductions", "KHR 4,270,000"],
                          ["Projected Net Payroll", "KHR 61,500,000"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Readiness summary</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {[
                          ["Ready Employees", "12"],
                          ["Needs Review", "2"],
                          ["Adjusted", "0"],
                          ["Excluded", "0"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl border px-4 py-3">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-lg font-semibold">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="shadow-none">
                    <CardHeader className="border-b">
                      <CardTitle className="text-base">Preview employees</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="overflow-x-auto rounded-xl border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="pl-4">Employee</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Gross Salary</TableHead>
                              <TableHead>Deduction</TableHead>
                              <TableHead>Net Salary</TableHead>
                              <TableHead className="pr-4">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewEmployees.map((employee) => (
                              <TableRow key={employee.name}>
                                <TableCell className="pl-4 font-medium">{employee.name}</TableCell>
                                <TableCell>{employee.department}</TableCell>
                                <TableCell>{employee.grossSalary}</TableCell>
                                <TableCell>{employee.deduction}</TableCell>
                                <TableCell>{employee.netSalary}</TableCell>
                                <TableCell className="pr-4">
                                  <StatusBadge value={employee.status} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(3)}>
                      Continue to Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {currentStep === 3 ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Step 3: Review &amp; Adjust</CardTitle>
                  <CardDescription>
                    Review employee-level payroll records, resolve issues, and apply manual adjustments if needed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <PayrollMetricCard title="Ready" value="12" description="Payroll records ready for finalization" />
                    <PayrollMetricCard title="Needs Review" value="2" description="Employees with attendance or calculation warnings" />
                    <PayrollMetricCard title="Adjusted" value="0" description="Manual adjustments applied" />
                    <PayrollMetricCard title="Net Payroll" value="KHR 61,500,000" description="Current projected final payroll" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="review-search">Search employee</Label>
                      <Input
                        id="review-search"
                        placeholder="Search by name or employee ID"
                        value={reviewFilters.search}
                        onChange={(event) => setReviewFilters((state) => ({ ...state, search: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-department">Department filter</Label>
                      <Select
                        value={reviewFilters.department}
                        onValueChange={(value) => setReviewFilters((state) => ({ ...state, department: value ?? "all" }))}
                      >
                        <SelectTrigger id="review-department" className="w-full">
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All departments</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-status">Status filter</Label>
                      <Select
                        value={reviewFilters.status}
                        onValueChange={(value) => setReviewFilters((state) => ({ ...state, status: value ?? "all" }))}
                      >
                        <SelectTrigger id="review-status" className="w-full">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="Ready">Ready</SelectItem>
                          <SelectItem value="Needs Review">Needs Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Base Salary</TableHead>
                          <TableHead>Overtime</TableHead>
                          <TableHead>Bonus</TableHead>
                          <TableHead>Deduction</TableHead>
                          <TableHead>Gross Salary</TableHead>
                          <TableHead>Net Salary</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="pr-4 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReviewEmployees.map((employee) => (
                          <TableRow key={employee.employeeId}>
                            <TableCell className="pl-4">
                              <div className="space-y-1">
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-xs text-muted-foreground">{employee.employeeId}</div>
                              </div>
                            </TableCell>
                            <TableCell>{employee.department}</TableCell>
                            <TableCell>{employee.baseSalary}</TableCell>
                            <TableCell>{employee.overtime}</TableCell>
                            <TableCell>{employee.bonus}</TableCell>
                            <TableCell>{employee.deduction}</TableCell>
                            <TableCell>{employee.grossSalary}</TableCell>
                            <TableCell>{employee.netSalary}</TableCell>
                            <TableCell>
                              <StatusBadge value={employee.status} />
                            </TableCell>
                            <TableCell className="pr-4">
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => console.log("View payroll record", employee)}>
                                  View Detail
                                </Button>
                                <Button type="button" size="sm" onClick={() => handleOpenAdjustment(employee)}>
                                  Adjust
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => setCurrentStep(4)}>
                      Continue to Finalize
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {currentStep === 4 ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Step 4: Finalize Payroll</CardTitle>
                  <CardDescription>
                    Confirm the final payroll summary and lock this payroll run when everything is verified.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {isFinalized ? (
                    <Card className="border-emerald-200 bg-emerald-50 shadow-none dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <CardHeader>
                        <CardTitle className="text-emerald-800 dark:text-emerald-200">Payroll finalized successfully.</CardTitle>
                        <CardDescription className="text-emerald-700 dark:text-emerald-300">
                          The May 2026 payroll run has been locked and is ready for downstream export.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 sm:flex-row">
                        <Button type="button" onClick={() => console.log("Export payslips")}>
                          Export Payslips
                        </Button>
                        <Button type="button" variant="outline" onClick={() => console.log("View payroll report")}>
                          View Payroll Report
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null}

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Final summary card</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {[
                          ["Payroll Period", "May 2026"],
                          ["Pay Cycle", "Monthly"],
                          ["Currency", "KHR"],
                          ["Employees Included", "14"],
                          ["Gross Payroll", "KHR 65,770,000"],
                          ["Total Deductions", "KHR 4,270,000"],
                          ["Net Payroll", "KHR 61,500,000"],
                          ["Status After Finalize", "Finalized"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl border px-4 py-3">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Finalization checklist</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3">
                        {[
                          "Payroll period confirmed",
                          "Employee records reviewed",
                          "Attendance issues checked",
                          "Salary adjustments reviewed",
                          "Net payroll verified",
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <Check className="size-4" />
                            </span>
                            <span className="text-sm font-medium">{item}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Finalizing payroll will lock this payroll run. After finalization, employee payroll records should not
                    be changed except through a correction run.
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                      Back
                    </Button>
                    <Button type="button" onClick={() => setIsFinalizeOpen(true)}>
                      Finalize Payroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="sticky bottom-4 z-20">
            <div className="rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={handleBackAction} disabled={currentStep === 1}>
                    Back
                  </Button>
                  <Button type="button" variant="outline" onClick={() => console.log("Save payroll draft")}>
                    Save Draft
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={handlePrimaryAction}>
                    {currentStep === 1
                      ? "Generate Payroll Preview"
                      : currentStep === 2
                        ? "Continue to Review"
                        : currentStep === 3
                          ? "Continue to Finalize"
                          : "Finalize Payroll"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppPageShell>

      <Sheet open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Payroll Adjustment</SheetTitle>
            <SheetDescription>Review the selected employee and record a manual payroll adjustment for this run.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 px-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="text-sm font-medium">{selectedEmployee?.name ?? "--"}</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedEmployee?.employeeId ?? "--"}</div>
              <div className="mt-3 text-sm text-muted-foreground">Department: {selectedEmployee?.department ?? "--"}</div>
              <div className="text-sm text-muted-foreground">Current net salary: {selectedEmployee?.netSalary ?? "--"}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment-type">Adjustment Type</Label>
              <Select
                value={adjustmentForm.adjustmentType}
                onValueChange={(value) =>
                  setAdjustmentForm((state) => ({
                    ...state,
                    adjustmentType: (value as AdjustmentType | null) ?? "Bonus",
                  }))
                }
              >
                <SelectTrigger id="adjustment-type" className="w-full">
                  <SelectValue placeholder="Select adjustment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bonus">Bonus</SelectItem>
                  <SelectItem value="Deduction">Deduction</SelectItem>
                  <SelectItem value="Correction">Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">Amount</Label>
              <Input
                id="adjustment-amount"
                placeholder="Enter amount"
                value={adjustmentForm.amount}
                onChange={(event) => setAdjustmentForm((state) => ({ ...state, amount: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment-reason">Reason</Label>
              <Textarea
                id="adjustment-reason"
                placeholder="Add the reason for this adjustment"
                value={adjustmentForm.reason}
                onChange={(event) => setAdjustmentForm((state) => ({ ...state, reason: event.target.value }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setIsAdjustmentOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAdjustment}>
              Save Adjustment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isFinalizeOpen} onOpenChange={setIsFinalizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize payroll run?</DialogTitle>
            <DialogDescription>
              This action will lock the payroll run for May 2026. You can still export payslips and reports after
              finalization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsFinalizeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmFinalize}>
              Confirm Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
