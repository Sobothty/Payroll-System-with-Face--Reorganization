"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/legacy-button";
import { Card } from "@/components/ui/legacy-card";
import { Field } from "@/components/ui/legacy-field";
import type { TaxBracket } from "@/lib/types";

let draftCounter = 0;

const currencyFormatter = new Intl.NumberFormat("en-US");

export type TaxBracketDraft = {
  key: string;
  id?: number;
  min_salary: number;
  max_salary: number | null;
  tax_percent: number;
  is_active: boolean;
};

type TaxBracketEditorProps = {
  brackets: TaxBracketDraft[];
  saving: boolean;
  message: string | null;
  onChange: (next: TaxBracketDraft[]) => void;
  onResetDefaults: () => void;
  onSave: () => void;
};

function nextDraftKey() {
  draftCounter += 1;
  return `tax-bracket-${draftCounter}`;
}

export function createTaxBracketDraft(bracket?: Partial<TaxBracket>): TaxBracketDraft {
  const normalizedPercent =
    typeof bracket?.tax_percent === "number"
      ? bracket.tax_percent
      : typeof bracket?.tax_rate === "number"
        ? bracket.tax_rate <= 1
          ? bracket.tax_rate * 100
          : bracket.tax_rate
        : 0;

  return {
    key: bracket?.id ? `tax-bracket-${bracket.id}` : nextDraftKey(),
    id: bracket?.id,
    min_salary: bracket?.min_salary ?? 0,
    max_salary: bracket?.max_salary ?? null,
    tax_percent: normalizedPercent,
    is_active: bracket?.is_active ?? true,
  };
}

export function getDefaultTaxBracketDrafts(): TaxBracketDraft[] {
  return [
    createTaxBracketDraft({ min_salary: 0, max_salary: 1500000, tax_percent: 0, is_active: true }),
    createTaxBracketDraft({ min_salary: 1500000, max_salary: 2000000, tax_percent: 5, is_active: true }),
    createTaxBracketDraft({ min_salary: 2000000, max_salary: 8500000, tax_percent: 10, is_active: true }),
    createTaxBracketDraft({ min_salary: 8500000, max_salary: 12500000, tax_percent: 15, is_active: true }),
    createTaxBracketDraft({ min_salary: 12500000, max_salary: null, tax_percent: 20, is_active: true }),
  ];
}

export function validateTaxBracketDrafts(brackets: TaxBracketDraft[]): string | null {
  const activeBrackets = brackets
    .filter((bracket) => bracket.is_active)
    .slice()
    .sort((left, right) => left.min_salary - right.min_salary);

  if (activeBrackets.length === 0) {
    return "At least one active tax bracket is required.";
  }
  if (activeBrackets[0]?.min_salary !== 0) {
    return "The first active tax bracket must start at 0 riel.";
  }

  let previousMax: number | null = null;
  for (let index = 0; index < activeBrackets.length; index += 1) {
    const bracket = activeBrackets[index];
    if (bracket.min_salary < 0) {
      return "Tax bracket salary values cannot be negative.";
    }
    if (bracket.max_salary !== null && bracket.max_salary <= bracket.min_salary) {
      return "Each bracket max salary must be greater than its min salary.";
    }
    if (bracket.tax_percent < 0 || bracket.tax_percent > 100) {
      return "Tax rate must stay between 0% and 100%.";
    }
    if (previousMax !== null && bracket.min_salary !== previousMax) {
      return "Active tax brackets must stay continuous without gaps or overlaps.";
    }
    if (bracket.max_salary === null && index !== activeBrackets.length - 1) {
      return "Only the final active tax bracket can be open-ended.";
    }
    previousMax = bracket.max_salary;
  }

  if (previousMax !== null) {
    return "The last active tax bracket must be open-ended.";
  }

  return null;
}

function formatRiel(value: number) {
  return `${currencyFormatter.format(value)} KHR`;
}

export default function TaxBracketEditor({
  brackets,
  saving,
  message,
  onChange,
  onResetDefaults,
  onSave,
}: TaxBracketEditorProps) {
  const validationMessage = useMemo(() => validateTaxBracketDrafts(brackets), [brackets]);
  const activeCount = useMemo(() => brackets.filter((bracket) => bracket.is_active).length, [brackets]);
  const highestRate = useMemo(() => brackets.reduce((max, bracket) => Math.max(max, bracket.tax_percent), 0), [brackets]);

  function updateBracket(index: number, patch: Partial<TaxBracketDraft>) {
    onChange(brackets.map((bracket, bracketIndex) => (bracketIndex === index ? { ...bracket, ...patch } : bracket)));
  }

  function removeBracket(index: number) {
    onChange(brackets.filter((_, bracketIndex) => bracketIndex !== index));
  }

  function addBracket() {
    const seed = brackets[brackets.length - 1];
    onChange([
      ...brackets,
      {
        key: nextDraftKey(),
        min_salary: seed?.max_salary ?? seed?.min_salary ?? 0,
        max_salary: null,
        tax_percent: seed?.tax_percent ?? 0,
        is_active: false,
      },
    ]);
  }

  return (
    <Card>
      <div className="header-row">
        <div>
          <h2 className="section-heading">Progressive Salary Tax</h2>
          <p className="table-subcopy">Configure monthly salary tax brackets in Cambodia riel. Payroll will apply the active ranges progressively.</p>
        </div>
        <div className="action-row">
          <Button tone="secondary" onClick={onResetDefaults} disabled={saving}>
            Reset Cambodia Defaults
          </Button>
          <Button tone="secondary" onClick={addBracket} disabled={saving}>
            Add Bracket
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Tax Brackets"}
          </Button>
        </div>
      </div>

      {message ? <div className="feedback-banner success" style={{ marginTop: 16 }}>{message}</div> : null}

      <div className="tax-bracket-summary" style={{ marginTop: 18 }}>
        <span className="tax-bracket-pill">{activeCount} active brackets</span>
        <span className="tax-bracket-pill">Top rate {highestRate}%</span>
        <span className="tax-bracket-pill">Final active bracket must stay open-ended</span>
      </div>

      <p className="tax-note" style={{ marginTop: 16 }}>
        Active ranges must start at <strong>0 KHR</strong>, connect without gaps, and end with one open-ended row.
        New rows start inactive so you can draft them safely before they affect payroll.
      </p>

      {validationMessage ? <div className="feedback-banner" style={{ marginTop: 16 }}>{validationMessage}</div> : null}

      <div className="tax-editor-grid">
        {brackets.map((bracket, index) => (
          <div key={bracket.key} className="tax-bracket-row">
            <div className="tax-bracket-top">
              <div>
                <div className="table-card-title">Bracket {String(index + 1).padStart(2, "0")}</div>
                <div style={{ fontWeight: 700 }}>
                  {formatRiel(bracket.min_salary)} to {bracket.max_salary === null ? "Open ended" : formatRiel(bracket.max_salary)}
                </div>
              </div>
              <div className="action-row">
                <span className="tax-bracket-pill">{bracket.is_active ? "Active" : "Inactive draft"}</span>
                <Button tone="danger" onClick={() => removeBracket(index)} disabled={saving || brackets.length === 1}>
                  Remove
                </Button>
              </div>
            </div>

            <div className="tax-bracket-fields">
              <Field label="Min Salary (KHR)">
                <input
                  className="text-input"
                  type="number"
                  min={0}
                  step="1"
                  value={bracket.min_salary}
                  onChange={(event) => updateBracket(index, { min_salary: Number(event.target.value || 0) })}
                />
              </Field>
              <Field label="Max Salary (KHR)">
                <input
                  className="text-input"
                  type="number"
                  min={0}
                  step="1"
                  value={bracket.max_salary ?? ""}
                  placeholder="Leave empty for final bracket"
                  onChange={(event) => updateBracket(index, { max_salary: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Field>
              <Field label="Tax Rate (%)">
                <input
                  className="text-input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={bracket.tax_percent}
                  onChange={(event) => updateBracket(index, { tax_percent: Number(event.target.value || 0) })}
                />
              </Field>
              <div className="tax-toggle">
                <span className="helper-text">Bracket Status</span>
                <label className="tax-toggle-box">
                  <input
                    type="checkbox"
                    checked={bracket.is_active}
                    onChange={(event) => updateBracket(index, { is_active: event.target.checked })}
                  />
                  <span>{bracket.is_active ? "Included in payroll tax" : "Draft only"}</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
