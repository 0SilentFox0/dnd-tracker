"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { duplicateTargets } from "@/lib/utils/content/import";
import { cellText } from "@/lib/utils/content/import/wizard";

function sampleOf(wizard: ContentImportState, header: string): string {
  const value = wizard.file.table?.rows.slice(0, 3).map((r) => r[header]).find((v) => v !== undefined && v !== null && String(v).trim() !== "");

  if (value === undefined) return "";

  const text = cellText(value);

  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

export function ColumnsStep({ wizard }: { wizard: ContentImportState }) {
  const t = useTranslations("contentImport.columns");

  const label = useTranslator();

  const { table, name } = wizard.file;

  if (!table) return null;

  const duplicates = duplicateTargets(wizard.spec.fields, wizard.mapping.value);

  const options = wizard.spec.fields.map((f) => ({ value: f.key, label: f.required ? `${label(f.labelKey)} *` : label(f.labelKey) }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">
        {t("summary", { name: name ?? "", rows: table.rows.length })}
      </p>
      {wizard.mapping.missing.length > 0 && (
        <p role="alert" className="text-sm text-red-400">
          {t("missing", { fields: wizard.mapping.missing.map((f) => label(f.labelKey)).join(", ") })}
        </p>
      )}
      {duplicates.length > 0 && (
        <p role="status" className="text-sm text-amber-400">
          {t("duplicates", { fields: duplicates.map((f) => label(f.labelKey)).join(", ") })}
        </p>
      )}
      {wizard.ai.available && (
        <Button type="button" variant="outline" size="sm" disabled={wizard.ai.busy} onClick={() => void wizard.ai.suggest()}>
          <Sparkles className="h-4 w-4" />
          {wizard.ai.busy ? t("aiBusy") : t("aiSuggest")}
        </Button>
      )}
      {wizard.ai.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-hud-muted">
          {wizard.ai.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {table.headers.map((header) => (
          <div key={header} className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:items-center sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{header}</p>
              <p className="truncate text-xs text-hud-muted">{sampleOf(wizard, header)}</p>
            </div>
            <SelectField aria-label={t("fieldFor", { header })} value={wizard.mapping.value[header] ?? ""} onValueChange={(v) => wizard.mapping.set(header, v || null)} options={options} allowNone noneLabel={t("skip")} />
          </div>
        ))}
      </div>
    </div>
  );
}
