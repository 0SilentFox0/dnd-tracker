import type { ConversionResult } from "./types";

export interface ReportRow {
  kind: "skill" | "race" | "artifact" | "artifactSet" | "unit";
  id: string;
  name: string;
  campaignId: string;
  result: ConversionResult;
  valid: boolean;
}

const status = (r: ReportRow) => (!r.valid ? "failed" : r.result.issues.length ? "lossy" : "exact");

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function buildConversionReport(rows: ReportRow[], meta: { date: string; mode: "dry-run" | "apply" | "force" }): string {
  const groups = { exact: rows.filter((r) => status(r) === "exact"), lossy: rows.filter((r) => status(r) === "lossy"), failed: rows.filter((r) => status(r) === "failed") };

  const table = (list: ReportRow[], reasons: (r: ReportRow) => string) =>
    ["| тип | назва | id | причини |", "|---|---|---|---|", ...list.map((r) => `| ${r.kind} | ${esc(r.name)} | ${r.id} | ${esc(reasons(r))} |`)].join("\n");

  return [
    `# Конвертація умінь — ${meta.date} (${meta.mode})`,
    "",
    `- Точно: ${groups.exact.length}`,
    `- З втратами: ${groups.lossy.length}`,
    `- Не вдалося: ${groups.failed.length}`,
    "",
    "## Не вдалося",
    "",
    table(groups.failed, () => "результат не пройшов валідацію"),
    "",
    "## З втратами / зміною поведінки",
    "",
    table(groups.lossy, (r) => r.result.issues.map((i) => `${i.severity === "behavior" ? "⚠️ " : ""}${i.message}`).join("; ")),
    "",
    "## Точно",
    "",
    table(groups.exact, () => ""),
    "",
  ].join("\n");
}
