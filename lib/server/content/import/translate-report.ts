import "server-only";
import { translateIssue } from "@/lib/i18n/translate-issue";
import type { Translator } from "@/lib/i18n/translator";
import { requestTranslator } from "@/lib/utils/api/translate-error";
import type { ImportIssue, ImportReport } from "@/types/content-import";

const KEY_PREFIX = "contentImport.";

// a param naming a catalogue key (field label, kind, nested detail) is translated with the issue's own params before formatting
function resolveParams(t: Translator, params: ImportIssue["params"]): ImportIssue["params"] {
  if (!params) return params;

  return Object.fromEntries(Object.entries(params).map(([name, value]) => [name, typeof value === "string" && value.startsWith(KEY_PREFIX) && t.has(value) ? t(value, params) : value]));
}

export function translateImportReport(t: Translator, report: ImportReport): ImportReport {
  return {
    ...report,
    results: report.results.map((row) => ({
      ...row,
      issues: row.issues.map(({ params, minimum, maximum, ...issue }) => ({ ...issue, message: translateIssue(t, { message: issue.message, params: resolveParams(t, params), minimum, maximum }) })),
    })),
  };
}

export async function translatedImport(report: ImportReport): Promise<ImportReport> {
  return translateImportReport(await requestTranslator(), report);
}
