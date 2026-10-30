import type { SrdKind } from "../lib/types";
import { type CatalogEntry, type Translations } from "./catalog";
import { buildNameMap, fixItalicNames } from "./names";
import { type Glossary, normalizeSpellHeader } from "./spell-header";
import { checkTranslation, type TranslationIssue } from "./validate";

export type Phase = "A" | "B";

const PHASE_A_KINDS: readonly SrdKind[] = ["races", "feats", "backgrounds", "classes"];

export const inPhase = (entry: CatalogEntry, phase: Phase) => {
  const a = entry.cls === "n" || entry.kinds.some((k) => PHASE_A_KINDS.includes(k));

  return phase === "A" ? a : !a;
};

export const missing = (entries: CatalogEntry[], tr: Translations) => entries.filter((e) => tr[e.hash] === undefined);

export function planBatches(entries: CatalogEntry[], maxChars: number): CatalogEntry[][] {
  const batches: CatalogEntry[][] = [];

  let size = 0;

  for (const entry of entries) {
    if (batches.length === 0 || (size + entry.en.length > maxChars && size > 0)) {
      batches.push([]);
      size = 0;
    }

    batches[batches.length - 1].push(entry);
    size += entry.en.length;
  }

  return batches;
}

export interface AppliedLine {
  h: string;
  t: string;
}

export interface Rejected extends AppliedLine {
  issues: Array<TranslationIssue | "unknown">;
}

export function mergeApplied(existing: Translations, lines: AppliedLine[], catalog: CatalogEntry[], glossary: Glossary = {}): { merged: Translations; accepted: number; rejected: Rejected[] } {
  const byHash = new Map(catalog.map((e) => [e.hash, e]));

  const merged = { ...existing };

  const names = buildNameMap(catalog, existing);

  const rejected: Rejected[] = [];

  let accepted = 0;

  for (const line of lines) {
    const entry = byHash.get(line.h);

    const t = entry ? normalizeSpellHeader(entry.en, fixItalicNames(entry.en, line.t, names), glossary) : line.t;

    const issues = entry ? checkTranslation(entry.en, t) : (["unknown"] as Rejected["issues"]);

    if (issues.length > 0) rejected.push({ ...line, issues });
    else {
      merged[line.h] = t;
      accepted += 1;
    }
  }

  return { merged, accepted, rejected };
}
