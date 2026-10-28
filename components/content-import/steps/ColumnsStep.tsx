"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { duplicateTargets } from "@/lib/utils/content/import";
import { cellText } from "@/lib/utils/content/import/wizard";

function sampleOf(wizard: ContentImportState, header: string): string {
  const value = wizard.file.table?.rows.slice(0, 3).map((r) => r[header]).find((v) => v !== undefined && v !== null && String(v).trim() !== "");

  if (value === undefined) return "";

  const text = cellText(value);

  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

export function ColumnsStep({ wizard }: { wizard: ContentImportState }) {
  const { table, name } = wizard.file;

  if (!table) return null;

  const duplicates = duplicateTargets(wizard.spec.fields, wizard.mapping.value);

  const options = wizard.spec.fields.map((f) => ({ value: f.key, label: f.required ? `${f.label} *` : f.label }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">
        Файл «{name}» · рядків: {table.rows.length}. Оберіть поле для кожної колонки.
      </p>
      {wizard.mapping.missing.length > 0 && (
        <p role="alert" className="text-sm text-red-400">
          {`Не зіставлено обов'язкові поля: ${wizard.mapping.missing.map((f) => f.label).join(", ")}`}
        </p>
      )}
      {duplicates.length > 0 && (
        <p role="status" className="text-sm text-amber-400">
          {`Кілька колонок → одне поле, використано першу: ${duplicates.map((f) => f.label).join(", ")}`}
        </p>
      )}
      {wizard.ai.available && (
        <Button type="button" variant="outline" size="sm" disabled={wizard.ai.busy} onClick={() => void wizard.ai.suggest()}>
          <Sparkles className="h-4 w-4" />
          {wizard.ai.busy ? "AI думає…" : "Підказати AI"}
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
            <SelectField aria-label={`Поле для «${header}»`} value={wizard.mapping.value[header] ?? ""} onValueChange={(v) => wizard.mapping.set(header, v || null)} options={options} allowNone noneLabel="— пропустити —" />
          </div>
        ))}
      </div>
    </div>
  );
}
