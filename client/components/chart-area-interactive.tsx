"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type TrendPoint = {
  label: string;
  attendance: number;
};

type DepartmentStat = {
  name: string;
  count: number;
  percent: number;
};

const chartConfig = {
  attendance: {
    label: "Check-ins",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({
  data,
  departments,
  weeklyCheckIns,
  attendanceRate,
  totalRuns,
}: {
  data: TrendPoint[];
  departments: DepartmentStat[];
  weeklyCheckIns: number;
  attendanceRate: number;
  totalRuns: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Attendance activity</CardTitle>
          <CardDescription>Check-in momentum across the current week, with department mix on the side.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{weeklyCheckIns.toLocaleString()} weekly check-ins</Badge>
          <Badge variant="outline">{Math.round(attendanceRate)}% coverage today</Badge>
          <Badge variant="outline">{totalRuns.toLocaleString()} payroll runs</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="attendance"
              type="natural"
              fill="var(--color-attendance)"
              fillOpacity={0.2}
              stroke="var(--color-attendance)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>

        <div className="grid gap-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="text-sm font-medium">Top departments</div>
            <div className="mt-1 text-sm text-muted-foreground">Current headcount distribution from active records.</div>
          </div>
          {departments.length ? (
            departments.map((department) => (
              <div key={department.name} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{department.name}</div>
                    <div className="text-xs text-muted-foreground">{department.count.toLocaleString()} employees</div>
                  </div>
                  <Badge variant="outline">{department.percent}%</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No department distribution is available yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

