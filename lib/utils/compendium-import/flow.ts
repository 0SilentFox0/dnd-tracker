import { ApiError } from "@/lib/api/client";
import { byteLength, COMPENDIUM_ERROR_KEYS, COMPENDIUM_KINDS, COMPENDIUM_LIMITS, COMPENDIUM_MATERIAL_KINDS, COMPENDIUM_REQUEST_HEADROOM_BYTES, type JsonRecord, oversizedRecordKind } from "@/lib/constants/compendium-import";
import type { Translator } from "@/lib/i18n/translator";
import type { CompendiumGraphRow, CompendiumOptions, ImportInput, ImportIssue } from "@/types/compendium-import";

export const MATERIAL_KINDS = new Set<string>(COMPENDIUM_MATERIAL_KINDS);
export const categoryLabel = (t: Translator, kind: string) => t.has(`categories.${kind}`) ? t(`categories.${kind}`) : kind;
export function categoryInventory(root: JsonRecord) {
  return Object.entries(root).filter(([kind]) => kind !== "_meta").map(([kind, value]) => ({ kind, count: Array.isArray(value) ? value.length : 1, supported: (COMPENDIUM_KINDS as readonly string[]).includes(kind), selected: (COMPENDIUM_KINDS as readonly string[]).includes(kind) && !MATERIAL_KINDS.has(kind) }));
}
export function projectInput(root: JsonRecord, categories: string[], options: Omit<ImportInput, "json" | "categories"> = {}, excludedChapters: string[] = []): ImportInput {
  root = { ...root };
  for (const kind of ["bookData", "adventureData"]) {
    if (Array.isArray(root[kind])) root[kind] = (root[kind] as JsonRecord[]).map((book, index) => ({ ...book, ...(Array.isArray(book.data) ? { data: book.data.filter((_, chapter) => !excludedChapters.includes(`${kind}[${index}].data[${chapter}]`)) } : {}) }));
  }

  // Send only counts/placeholders for unsupported roots, so the existing adapter records
  // skipped paths in the saved report without receiving media/Foundry/unknown values.
  const unsupported = categoryInventory(root).filter(row => !row.supported);

  for (const row of unsupported) root[row.kind] = Array.from({ length: row.count }, () => ({}));
  categories = [...new Set([...categories, ...unsupported.map(row => row.kind)])];

  const oversized = oversizedRecordKind(root, categories);

  if (oversized) throw new Error(`RECORD_SIZE: ${oversized}`);

  const input = { ...options, categories, json: JSON.stringify(Object.fromEntries(Object.entries(root).filter(([key]) => key === "_meta" || categories.includes(key)))) };

  if (byteLength(JSON.stringify(input)) > COMPENDIUM_LIMITS.requestBytes - COMPENDIUM_REQUEST_HEADROOM_BYTES) throw new Error("REQUEST_SIZE: $");

  return input;
}
export function destination(campaignId: string, row: { kind?: string; targetId?: string; code?: string }) {
  const base = `/campaigns/${encodeURIComponent(campaignId)}/dm`;

  if (row.code === "CHARACTERS_REQUIRED" || /GEAR|GOLD|EQUIPMENT|CURRENCY/.test(row.code ?? "")) return `${base}/characters`;

  if (row.kind === "scenarioPages") return `${base}/scenario${row.targetId ? `/${encodeURIComponent(row.targetId)}` : ""}`;

  if (row.kind) return `${base}/${row.kind}${row.targetId ? `/${encodeURIComponent(row.targetId)}` : ""}`;

  return `/campaigns/${encodeURIComponent(campaignId)}`;
}
export function excludeBlocked(issues: ImportIssue[]) {
  return [...new Set(issues.filter(i => i.severity === "error").flatMap(i => i.path.match(/^[a-zA-Z][a-zA-Z0-9]*\[\d+\]/)?.[0] ?? []))];
}
export function blockedClosure(graph: CompendiumGraphRow[], issues: ImportIssue[]) {
  const blocked = new Set(graph.filter(row => issues.some(issue => issue.severity === "error" && issue.path.startsWith(row.key))).map(row => row.key));

  let changed = true;

  while (changed) {
    changed = false;

    for (const row of graph) {
      if (!blocked.has(row.key) && row.refs.some(ref => blocked.has(ref.key))) {
        blocked.add(row.key);
        changed = true;
      }
    }
  }

  return blocked;
}
export function excludeAllBlocked(options: CompendiumOptions, graph: CompendiumGraphRow[], issues: ImportIssue[]): CompendiumOptions {
  return { ...options, excludedKeys: [...new Set([...(options.excludedKeys ?? []), ...blockedClosure(graph, issues)])], excludedPaths: [...new Set([...(options.excludedPaths ?? []), ...excludeBlocked(issues)])] };
}
export function compendiumErrorMessage(t: Translator, error: unknown, fallbackKey: string) {
  const code = error instanceof ApiError ? (error.body as { code?: unknown } | null)?.code : undefined;

  if (typeof code === "string") return COMPENDIUM_ERROR_KEYS[code] ? t(COMPENDIUM_ERROR_KEYS[code]) : t("errors.unknownCode", { code });

  if (error instanceof ApiError) return t("errors.httpError");

  if (!(error instanceof Error)) return t(fallbackKey);

  const [head, ...rest] = error.message.split(":");

  const key = COMPENDIUM_ERROR_KEYS[head];

  return key ? t(key, head === "RECORD_SIZE" ? { kind: categoryLabel(t, rest.join(":").trim()) } : undefined) : error.message;
}
