"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActivityRow = {
  name: string;
  department: string;
  action: string;
  time: string;
  confidence?: number;
};

function formatAction(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DataTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recent biometric activity</CardTitle>
          <CardDescription>Latest attendance events captured from the overview summary feed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, index) => (
                  <TableRow key={`${row.name}-${row.time}-${index}`}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatAction(row.action)}</Badge>
                    </TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell className="text-right">
                      {typeof row.confidence === "number" ? `${Math.round(row.confidence)}%` : "--"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No recent attendance activity is available yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

