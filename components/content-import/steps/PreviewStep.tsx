"use client";

import { useTranslations } from "next-intl";

import { ErrorReportButton } from "../ErrorReportButton";
import { ImportCounts } from "../ImportCounts";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_LIMITS, IMPORT_MODES } from "@/lib/utils/content/import";
import type { ImportMode } from "@/types/content-import";

export function PreviewStep({ wizard }: { wizard: ContentImportState }) {
  const t = useTranslations("contentImport");

  const report = wizard.preview;

  if (!report) return null;

  const modeOptions = IMPORT_MODES.map((value) => ({ value, label: t(`modes.${value}`) }));

  const rows = report.results.slice(0, IMPORT_LIMITS.previewRows);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="content-import-mode">{t("preview.mode")}</Label>
        <SelectField id="content-import-mode" value={wizard.mode.value} onValueChange={(v) => wizard.mode.set(v as ImportMode)} options={modeOptions} disabled={wizard.status.busy} />
      </div>
      <ImportCounts report={report} />
      <div className="max-h-[45vh] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-hud-muted">
              <th className="p-1">{t("preview.row")}</th>
              <th className="p-1">{t("preview.name")}</th>
              <th className="p-1">{t("preview.status")}</th>
              <th className="p-1">{t("preview.errors")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row} className={r.status === "error" ? "text-red-400" : undefined}>
                <td className="p-1">{r.row}</td>
                <td className="p-1">{r.name ?? "—"}</td>
                <td className="p-1">{t(`status.${r.status}.${report.dryRun ? "planned" : "done"}`)}</td>
                <td className="p-1">{r.issues.map((i) => i.message).join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.results.length > rows.length && <p className="text-xs text-hud-muted">{t("preview.shown", { shown: rows.length, total: report.results.length })}</p>}
      <ErrorReportButton wizard={wizard} report={report} />
    </div>
  );
}
