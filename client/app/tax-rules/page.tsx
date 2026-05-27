"use client";

import { useEffect, useState } from "react";

import { AppPageShell } from "@/components/app-page-shell";
import TaxBracketEditor, { createTaxBracketDraft, getDefaultTaxBracketDrafts, type TaxBracketDraft, validateTaxBracketDrafts } from "@/components/payroll/TaxBracketEditor";
import { Card } from "@/components/ui/legacy-card";
import { apiFetch } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import type { TaxBracket, TaxBracketUpdatePayload } from "@/lib/types";

export default function TaxRulesPage() {
  const [taxBrackets, setTaxBrackets] = useState<TaxBracketDraft[]>(getDefaultTaxBracketDrafts());
  const [taxMessage, setTaxMessage] = useState<string | null>(null);
  const [savingTaxBrackets, setSavingTaxBrackets] = useState(false);

  useEffect(() => {
    apiFetch<TaxBracket[]>("/api/payroll/tax-brackets")
      .then((nextBrackets) => {
        setTaxBrackets(nextBrackets.map((bracket) => createTaxBracketDraft(bracket)));
      })
      .catch(() => undefined);
  }, []);

  async function saveTaxBrackets() {
    const validation = validateTaxBracketDrafts(taxBrackets);
    if (validation) {
      showErrorToast(validation);
      setTaxMessage(null);
      return;
    }

    setSavingTaxBrackets(true);
    setTaxMessage(null);
    try {
      const payload: TaxBracketUpdatePayload = {
        brackets: taxBrackets.map((bracket) => ({
          min_salary: bracket.min_salary,
          max_salary: bracket.max_salary,
          tax_rate: bracket.tax_percent,
          is_active: bracket.is_active,
        })),
      };
      const saved = await apiFetch<TaxBracket[]>("/api/payroll/tax-brackets", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setTaxBrackets(saved.map((bracket) => createTaxBracketDraft(bracket)));
      setTaxMessage("Progressive tax brackets saved.");
    } catch {
      // Toast is shown by apiFetch.
    } finally {
      setSavingTaxBrackets(false);
    }
  }

  return (
    <AppPageShell pathname="/tax-rules">
      <div className="form-grid px-4 lg:px-6">
      <Card>
        <div className="report-hero motion-rise">
          <div>
            <h2 className="section-heading" style={{ marginBottom: 10 }}>Tax Rules</h2>
            <p className="table-subcopy">
              Manage Cambodia salary tax brackets in one place. Changes here affect payroll calculations immediately for future previews and runs.
            </p>
          </div>
        </div>
      </Card>

      <div className="motion-rise" style={{ animationDelay: "80ms" }}>
        <TaxBracketEditor
          brackets={taxBrackets}
          saving={savingTaxBrackets}
          message={taxMessage}
          onChange={(next) => {
            setTaxBrackets(next);
            setTaxMessage(null);
          }}
          onResetDefaults={() => {
            setTaxBrackets(getDefaultTaxBracketDrafts());
            setTaxMessage(null);
          }}
          onSave={saveTaxBrackets}
        />
      </div>
      </div>
    </AppPageShell>
  );
}
