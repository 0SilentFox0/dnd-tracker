import type { Compendium, JsonRecord } from "./parse";

import type { ErrorParams } from "@/lib/constants/api-errors";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translator";
import type { ContentKind } from "@/lib/server/content/define-resource";

export type Edition = "classic" | "one" | "unknown";
export type TargetKind = ContentKind | "scenarioPages";
export interface ImportIssue { code: string; severity: "warning" | "error"; path: string; params?: ErrorParams; action?: string }
export interface CompendiumRef { path: (string | number)[]; kind: string; name: string; source: string; edition: Edition; parent?: string[] }
export interface AdaptedEntry {
  inputPath?: string;
  key: string;
  inputKind: string;
  kind: TargetKind;
  source: string;
  edition: Edition;
  name: string;
  body: JsonRecord;
  refs: CompendiumRef[];
  notes: string;
  issues: ImportIssue[];
  mergeParent?: CompendiumRef;
  attribution?: JsonRecord;
}
export interface AdaptedCompendium { entries: AdaptedEntry[]; issues: ImportIssue[]; sources: JsonRecord[]; blocked?: Array<{ key?: string; path: string }>; embedded?: Record<string, number> }
export interface AdaptOptions { locale?: Locale; excludedPaths?: readonly string[]; categories?: readonly string[]; sourceBindings?: Readonly<Record<string, string>> }
export type Adapter = (row: JsonRecord, context: AdapterContext) => { kind: TargetKind; body: JsonRecord; refs?: CompendiumRef[]; notes?: string } | null;
export interface AdapterContext {
  root: Compendium;
  inputKind: string;
  path: string;
  source: string;
  edition: Edition;
  key: string;
  issues: ImportIssue[];
  t: Translator;
}

export function issue(code: string, path: string, severity: ImportIssue["severity"] = "warning", params?: ErrorParams): ImportIssue {
  return { code, path, severity, ...(params && { params }) };
}

export function translateCompendiumIssue(t: Translator, entry: ImportIssue): ImportIssue {
  if (typeof entry.action === "string") return entry;

  const { params, ...rest } = entry;

  const key = `issues.${entry.code}`;

  return { ...rest, action: t.has(key) ? t(key, params) : t("issues.default") };
}

export function translateCompendiumReport<R extends { rows: Array<{ issues: ImportIssue[] }>; nextActions: ImportIssue[] }>(t: Translator, report: R): R {
  const translate = (issues: ImportIssue[]) => issues.map((entry) => translateCompendiumIssue(t, entry));

  return { ...report, rows: report.rows.map((row) => ({ ...row, issues: translate(row.issues) })), nextActions: translate(report.nextActions) };
}
