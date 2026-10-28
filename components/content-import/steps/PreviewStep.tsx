"use client";

import { ErrorReportButton } from "../ErrorReportButton";
import { ImportCounts } from "../ImportCounts";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_LIMITS, IMPORT_MODES } from "@/lib/utils/content/import";
import { statusLabel } from "@/lib/utils/content/import/wizard";
import type { ImportMode } from "@/types/content-import";

const MODE_LABELS: Record<ImportMode, string> = {
  create: "Лише нові (дубль назви — помилка)",
  update: "Оновити за назвою, нові — створити",
  skip: "Пропустити наявні",
};

const MODE_OPTIONS = IMPORT_MODES.map((value) => ({ value, label: MODE_LABELS[value] }));

export function PreviewStep({ wizard }: { wizard: ContentImportState }) {
  const report = wizard.preview;

  if (!report) return null;

  const rows = report.results.slice(0, IMPORT_LIMITS.previewRows);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="content-import-mode">Режим</Label>
        <SelectField id="content-import-mode" value={wizard.mode.value} onValueChange={(v) => wizard.mode.set(v as ImportMode)} options={MODE_OPTIONS} disabled={wizard.status.busy} />
      </div>
      <ImportCounts report={report} />
      <div className="max-h-[45vh] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-hud-muted">
              <th className="p-1">Рядок</th>
              <th className="p-1">Назва</th>
              <th className="p-1">Статус</th>
              <th className="p-1">Помилки</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row} className={r.status === "error" ? "text-red-400" : undefined}>
                <td className="p-1">{r.row}</td>
                <td className="p-1">{r.name ?? "—"}</td>
                <td className="p-1">{statusLabel(r.status, report.dryRun)}</td>
                <td className="p-1">{r.issues.map((i) => i.message).join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.results.length > rows.length && <p className="text-xs text-hud-muted">{`Показано перші ${rows.length} з ${report.results.length}`}</p>}
      <ErrorReportButton wizard={wizard} report={report} />
    </div>
  );
}
