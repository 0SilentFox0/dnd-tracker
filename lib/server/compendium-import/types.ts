import type { Compendium, JsonRecord } from "./parse";

import type { ContentKind } from "@/lib/server/content/define-resource";

export type Edition = "classic" | "one" | "unknown";
export type TargetKind = ContentKind | "scenarioPages";
export interface ImportIssue { code: string; severity: "warning" | "error"; path: string; action: string }
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
export interface AdaptOptions { excludedPaths?: readonly string[]; categories?: readonly string[]; sourceBindings?: Readonly<Record<string, string>> }
export type Adapter = (row: JsonRecord, context: AdapterContext) => { kind: TargetKind; body: JsonRecord; refs?: CompendiumRef[]; notes?: string } | null;
export interface AdapterContext {
  root: Compendium;
  inputKind: string;
  path: string;
  source: string;
  edition: Edition;
  key: string;
  issues: ImportIssue[];
}

export function issue(code: string, path: string, severity: ImportIssue["severity"] = "warning", action = "Перевірте опис і налаштуйте вручну"): ImportIssue {
  return { code, path, severity, action };
}
