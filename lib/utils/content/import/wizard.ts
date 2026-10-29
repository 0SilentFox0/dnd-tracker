import { emptyCounts, IMPORT_LIMITS, IMPORT_STATUSES } from "./kinds";
import { ImportFileError, toCsv } from "./table";

import { isRecord } from "@/lib/utils/common/is-record";
import type { ImportField, ImportKind, ImportMapping, ImportReport, ImportRowStatus, ParsedTable } from "@/types/content-import";

const TEXT_EXTENSIONS = new Set(["csv", "tsv", "txt", "json"]);

export const IMPORT_ACCEPT = [...TEXT_EXTENSIONS].map((e) => `.${e}`).join(",");

const SPREADSHEETS = new Set(["xlsx", "xls", "ods", "numbers"]);

export function decodeImportBytes(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1251").decode(bytes);
  }
}

export async function readImportFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (SPREADSHEETS.has(ext)) throw new ImportFileError("contentImport.file.xlsxUnsupported");

  if (!TEXT_EXTENSIONS.has(ext)) throw new ImportFileError("contentImport.file.unsupportedType");

  return decodeImportBytes(await file.arrayBuffer());
}

export const statusKey = (status: ImportRowStatus, dryRun: boolean) => `contentImport.status.${status}.${dryRun ? "planned" : "done"}`;

export function mergeReports(parts: ReadonlyArray<{ offset: number; report: ImportReport }>, dryRun: boolean): ImportReport {
  const counts = emptyCounts();

  for (const { report } of parts) {
    for (const status of IMPORT_STATUSES) counts[status] += report.counts[status];
  }

  return { dryRun, counts, results: parts.flatMap(({ offset, report }) => report.results.map((r) => ({ ...r, row: r.row + offset }))) };
}

export const cellText = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v));

export interface ErrorReportText {
  statusHeader: string;
  errorsHeader: string;
  status: (status: ImportRowStatus, dryRun: boolean) => string;
}

export function reportToCsv(table: ParsedTable, report: ImportReport, text: ErrorReportText): string {
  const rows = report.results
    .filter((r) => r.status === "error")
    .map((r) => [...table.headers.map((h) => cellText(table.rows[r.row - 1]?.[h])), text.status(r.status, report.dryRun), r.issues.map((i) => i.message).join("; ")]);

  return toCsv([...table.headers, text.statusHeader, text.errorsHeader], rows);
}

export function aiSample(table: ParsedTable): Array<Record<string, string>> {
  const headers = table.headers.slice(0, IMPORT_LIMITS.aiHeaders);

  return table.rows.slice(0, IMPORT_LIMITS.aiSampleRows).map((row) => Object.fromEntries(headers.map((h) => [h, cellText(row[h]).slice(0, IMPORT_LIMITS.aiCellChars)])));
}

function hash(s: string): string {
  let h = 5381;

  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;

  return (h >>> 0).toString(36);
}

export const mappingStorageKey = (kind: ImportKind, headers: readonly string[]) => `content-import-mapping:${kind}:${hash(headers.join("\u0001"))}`;

export function loadStoredMapping(kind: ImportKind, headers: readonly string[], fields: readonly ImportField[]): ImportMapping {
  try {
    const raw = window.localStorage.getItem(mappingStorageKey(kind, headers));

    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (!isRecord(parsed)) return {};

    const keys = new Set(fields.map((f) => f.key));

    return Object.fromEntries(
      headers
        .filter((h) => Object.hasOwn(parsed, h))
        .map((h) => {
          const v = parsed[h];

          return [h, typeof v === "string" && keys.has(v) ? v : null];
        }),
    );
  } catch {
    return {};
  }
}

export function saveStoredMapping(kind: ImportKind, headers: readonly string[], mapping: ImportMapping): void {
  try {
    window.localStorage.setItem(mappingStorageKey(kind, headers), JSON.stringify(mapping));
  } catch {
    // private mode: the mapping just won't be remembered
  }
}
