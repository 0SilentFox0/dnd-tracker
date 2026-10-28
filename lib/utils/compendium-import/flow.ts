import { byteLength, COMPENDIUM_KINDS, COMPENDIUM_LIMITS, CompendiumError, type JsonRecord } from "@/lib/server/compendium-import/parse";
import type { ImportInput } from "@/lib/server/compendium-import/service";
import type { ImportIssue } from "@/lib/server/compendium-import/types";

export const MATERIAL_KINDS = new Set(["book", "bookData", "adventure", "adventureData"]);
export const CATEGORY_LABELS: Record<string, string> = { spell: "Заклинання", monster: "Юніти", item: "Предмети", baseitem: "Базові предмети", race: "Раси", subrace: "Підраси", background: "Передісторії", feat: "Риси", class: "Класи", classFeature: "Вміння класів", subclass: "Підкласи", subclassFeature: "Вміння підкласів", optionalfeature: "Опційні вміння", book: "Маніфести книг", bookData: "Сторінки книг", adventure: "Маніфести пригод", adventureData: "Сторінки пригод", table: "Таблиці", reward: "Нагороди", condition: "Стани", skill: "Навички", language: "Мови", itemProperty: "Властивості предметів", itemType: "Типи предметів" };
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

  const input = { ...options, categories, json: JSON.stringify(Object.fromEntries(Object.entries(root).filter(([key]) => key === "_meta" || categories.includes(key)))) };

  if (byteLength(JSON.stringify(input)) > COMPENDIUM_LIMITS.requestBytes - 8192) throw new CompendiumError("REQUEST_SIZE");

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
