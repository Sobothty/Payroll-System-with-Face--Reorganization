"use client";

import { useMemo } from "react";

type DepartmentDatum = {
  name: string;
  count: number;
  percent: number;
};

const palette = ["#6366F1", "#0EA5E9", "#F59E0B", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6", "#22C55E"];

export function getEmployeeDepartmentColor(index: number) {
  return palette[index % palette.length];
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [`M ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`].join(" ");
}

export function EmployeeDepartmentChart({
  departments,
  totalEmployees,
}: {
  departments: DepartmentDatum[];
  totalEmployees: number;
}) {
  const chartDepartments = useMemo(() => departments, [departments]);
  const center = 180;
  const outerRadius = 132;
  const minInnerRadius = 54;
  const gap = chartDepartments.length > 4 ? 8 : 12;
  const ringWidth = Math.max(
    8,
    Math.min(18, (outerRadius - minInnerRadius - gap * Math.max(chartDepartments.length - 1, 0)) / Math.max(chartDepartments.length, 1)),
  );
  const trackColor = "color-mix(in srgb, var(--muted) 55%, transparent)";
  const startAngle = 18;
  const availableAngle = 300;

  if (!chartDepartments.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No department distribution is available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <svg viewBox="0 0 360 360" className="h-full w-full overflow-visible">
          {chartDepartments.map((department, index) => {
            const radius = outerRadius - index * (ringWidth + gap);
            const angle = totalEmployees ? (department.count / totalEmployees) * availableAngle : 0;
            const endAngle = startAngle + Math.max(angle, 8);
            const color = getEmployeeDepartmentColor(index);

            return (
              <g key={department.name}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={trackColor}
                  strokeWidth={ringWidth}
                />
                <path
                  d={describeArc(center, center, radius, startAngle, endAngle)}
                  fill="none"
                  stroke={color}
                  strokeWidth={ringWidth}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-background/95 text-center shadow-sm ring-1 ring-border/70">
            <div className="text-4xl font-semibold leading-none text-primary">{totalEmployees.toLocaleString()}</div>
            <div className="mt-2 text-sm font-medium text-foreground">Employees</div>
            <div className="text-xs text-muted-foreground">{chartDepartments.length} departments</div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {chartDepartments.map((department, index) => (
          <div key={department.name} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getEmployeeDepartmentColor(index) }}
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium">{department.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {department.count.toLocaleString()} · {department.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
