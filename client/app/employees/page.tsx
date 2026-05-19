"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api";
import type { Employee } from "@/lib/types";

const initialForm = {
  full_name: "",
  employee_code: "",
  department: "Operations",
  position: "",
  pay_type: "monthly",
  base_salary: 0,
  hire_date: new Date().toISOString().slice(0, 10),
  email: "",
  phone: "",
  temporary_password: "password123",
  status: "active",
  compensation_effective_from: new Date().toISOString().slice(0, 10),
  compensation_reason: "",
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState({ search: "", department: "", status: "" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  async function loadEmployees() {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "200");
    if (filters.search) params.set("search", filters.search);
    if (filters.department) params.set("department", filters.department);
    if (filters.status) params.set("status", filters.status);
    const data = await apiFetch<{ items: Employee[] }>(`/api/employees?${params.toString()}`);
    setEmployees(data.items);
  }

  useEffect(() => {
    loadEmployees().catch(() => undefined);
  }, [filters.search, filters.department, filters.status]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setFormError("");
    setOpen(true);
  }

  async function openEdit(employee: Employee) {
    setFormError("");
    const fullEmployee = await apiFetch<Employee>(`/api/employees/${employee.id}`);
    setEditing(employee);
    setForm({
      ...initialForm,
      ...fullEmployee,
      hire_date: fullEmployee.hire_date.slice(0, 10),
      temporary_password: "password123",
      base_salary: Number(fullEmployee.base_salary),
      phone: fullEmployee.phone ?? "",
      compensation_effective_from: new Date().toISOString().slice(0, 10),
      compensation_reason: "",
    });
    setEditing(fullEmployee);
    setOpen(true);
  }

  async function submitForm() {
    setFormError("");
    const body = JSON.stringify(form);
    try {
      if (editing) {
        await apiFetch(`/api/employees/${editing.id}`, { method: "PUT", body });
        setOpen(false);
        await loadEmployees();
        return;
      }
      const created = await apiFetch<Employee>("/api/employees", { method: "POST", body });
      setOpen(false);
      await loadEmployees();
      router.push(`/face-registration?employee_id=${created.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save employee.");
    }
  }

  async function softDelete(employee: Employee) {
    await apiFetch(`/api/employees/${employee.id}`, { method: "DELETE" });
    await loadEmployees();
  }

  return (
    <>
      <Card>
        <div className="header-row">
          <div>
            <h2 className="section-heading">Workforce Directory</h2>
            <p className="table-subcopy">Search, filter, create, and route directly into webcam-based face enrollment.</p>
          </div>
          <Button type="button" onClick={openCreate}>Create Employee</Button>
        </div>

        <div className="filters-row" style={{ marginTop: 18 }}>
          <input
            className="text-input"
            placeholder="Search by name or code"
            value={filters.search}
            onChange={(event) => setFilters((state) => ({ ...state, search: event.target.value }))}
          />
          <select
            className="select-input"
            value={filters.department}
            onChange={(event) => setFilters((state) => ({ ...state, department: event.target.value }))}
          >
            <option value="">All departments</option>
            <option value="Operations">Operations</option>
            <option value="Engineering">Engineering</option>
            <option value="Finance">Finance</option>
            <option value="HR">HR</option>
          </select>
          <select
            className="select-input"
            value={filters.status}
            onChange={(event) => setFilters((state) => ({ ...state, status: event.target.value }))}
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <table className="list-table" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Pay Type</th>
              <th>Base Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.employee_code}</td>
                <td>{employee.full_name}</td>
                <td>{employee.department}</td>
                <td>{employee.position}</td>
                <td>{employee.pay_type}</td>
                <td>${Number(employee.base_salary).toLocaleString()}</td>
                <td className={employee.status === "active" ? "status-active" : "status-inactive"}>{employee.status}</td>
                <td>
                  <div className="action-row">
                    <Button type="button" tone="secondary" onClick={() => openEdit(employee)}>
                      Edit
                    </Button>
                    <Button type="button" tone="success" onClick={() => router.push(`/face-registration?employee_id=${employee.id}`)}>
                      Register Face
                    </Button>
                    <Button type="button" tone="danger" onClick={() => softDelete(employee)}>
                      Disable
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="slide-panel" onClick={(event) => event.stopPropagation()}>
            <Card>
              <div className="header-row">
                <h2 className="section-heading">{editing ? "Edit Employee" : "Create Employee"}</h2>
                <Button type="button" tone="secondary" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
              <div className="form-grid">
              <div className="grid-two">
                <Field label="Full Name">
                  <input className="text-input" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
                </Field>
                <Field label="Employee Code">
                  <input className="text-input" value={form.employee_code} onChange={(event) => setForm({ ...form, employee_code: event.target.value })} />
                </Field>
              </div>
              <div className="grid-two">
                <Field label="Department">
                  <input className="text-input" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
                </Field>
                <Field label="Position">
                  <input className="text-input" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
                </Field>
              </div>
              <div className="grid-two">
                <Field label="Pay Type">
                  <select className="select-input" value={form.pay_type} onChange={(event) => setForm({ ...form, pay_type: event.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </Field>
                <Field label="Base Salary (USD)">
                  <input
                    className="text-input"
                    type="number"
                    value={form.base_salary}
                    onChange={(event) => setForm({ ...form, base_salary: Number(event.target.value) })}
                  />
                </Field>
              </div>
              <div className="grid-two">
                <Field label="Compensation Effective From">
                  <input
                    className="text-input"
                    type="date"
                    value={form.compensation_effective_from}
                    onChange={(event) => setForm({ ...form, compensation_effective_from: event.target.value })}
                  />
                </Field>
                <Field label="Compensation Reason">
                  <input
                    className="text-input"
                    value={form.compensation_reason}
                    onChange={(event) => setForm({ ...form, compensation_reason: event.target.value })}
                  />
                </Field>
              </div>
              <div className="grid-two">
                <Field label="Hire Date">
                  <input className="text-input" type="date" value={form.hire_date} onChange={(event) => setForm({ ...form, hire_date: event.target.value })} />
                </Field>
                <Field label="Status">
                  <select className="select-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>
              <div className="grid-two">
                <Field label="Email">
                  <input className="text-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </Field>
                <Field label="Phone">
                  <input className="text-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </Field>
              </div>
              {!editing ? (
                <Field label="Temporary Password">
                  <input
                    className="text-input"
                    type="password"
                    value={form.temporary_password}
                    onChange={(event) => setForm({ ...form, temporary_password: event.target.value })}
                  />
                </Field>
              ) : null}
              {editing?.compensation_history?.length ? (
                <div className="form-grid">
                  <h3 className="section-heading">Compensation History</h3>
                  {editing.compensation_history.map((item) => (
                    <div key={item.id} className="activity-row" style={{ padding: 14 }}>
                      <div>
                        <strong>{item.effective_from}</strong>
                        <div className="muted">{item.pay_type} · ${Number(item.base_salary).toLocaleString()}</div>
                      </div>
                      <div className="muted">{item.reason || "Compensation update"}</div>
                    </div>
                  ))}
                </div>
              ) : null}
                {formError ? <div className="feedback-banner error">{formError}</div> : null}
                <Button type="button" onClick={submitForm}>{editing ? "Save Employee" : "Create Employee"}</Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
