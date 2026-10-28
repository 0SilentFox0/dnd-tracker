import "server-only";
import { translateIssue } from "@/lib/i18n/translate-issue";
import type { Translator } from "@/lib/i18n/translator";
import { requestTranslator } from "@/lib/utils/api/translate-error";
import type { ImportReport } from "@/types/content-import";

export function translateImportReport(t: Translator, report: ImportReport): ImportReport {
  return {
    ...report,
    results: report.results.map((row) => ({
      ...row,
      issues: row.issues.map(({ params, minimum, maximum, ...issue }) => ({ ...issue, message: translateIssue(t, { message: issue.message, params, minimum, maximum }) })),
    })),
  };
}

export async function translatedImport(report: ImportReport): Promise<ImportReport> {
  return translateImportReport(await requestTranslator(), report);
}
