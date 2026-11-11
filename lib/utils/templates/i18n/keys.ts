import { classOf, isTranslatable, type TextClass } from "./catalog";

import { slugify } from "@/lib/utils/templates/slug";

/** Pseudo-kind of free-form spell list names (templates without classes). */
export const PACK_LIST_KIND = "lists";

export interface TranslationEntry { text: string; en: string }

/** Key: "<kind>/<slug>/<fieldPath>". */
export type TranslationsV2 = Record<string, TranslationEntry>;

export interface KeyedString { key: string; kind: string; slug: string; fieldPath: string; cls: TextClass; en: string }

export type EntryStatus = "ok" | "stale" | "missing" | "orphan";

export const safeSlug = (name: string): string | null => {
  try { return slugify(name); } catch { return null; }
};

const unique = (values: readonly string[]) => {
  const filled = values.filter(Boolean);

  return new Set(filled).size === filled.length;
};

const field = (item: unknown, name: "id" | "name"): string => (item && typeof item === "object" && typeof (item as Record<string, unknown>)[name] === "string" ? String((item as Record<string, unknown>)[name]) : "");

/** Segments that survive reordering: element id, else unique name, else index. */
export function arraySegments(array: readonly unknown[]): string[] {
  const ids = array.map((item) => field(item, "id"));

  const slugs = array.map((item) => safeSlug(field(item, "name")) ?? "");

  const byId = unique(ids);

  const byName = unique(slugs);

  return array.map((_, i) => (ids[i] && byId ? `[#${ids[i]}]` : slugs[i] && byName ? `[=${slugs[i]}]` : `[${i}]`));
}

export interface KeyedSite { fieldPath: string; key: string; parent: string; path: readonly string[]; text: string }

/** Like `mapStrings`, but each string also gets its stable field path. */
export function mapKeyed(value: unknown, visit: (site: KeyedSite) => string, fieldPath = "", key = "", parent = "", path: readonly string[] = []): unknown {
  if (typeof value === "string") return visit({ fieldPath, key, parent, path, text: value });

  if (Array.isArray(value)) {
    const segments = arraySegments(value);

    return value.map((item, index) => mapKeyed(item, visit, `${fieldPath}${segments[index]}`, key, parent, path));
  }

  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapKeyed(v, visit, fieldPath ? `${fieldPath}.${k}` : k, k, key, [...path, k])]));

  return value;
}

const keyOf = (kind: string, slug: string, fieldPath: string) => `${kind}/${slug}/${fieldPath}`;

function keyedOf(kind: string, slug: string, value: unknown, prefix = ""): KeyedString[] {
  const out: KeyedString[] = [];

  mapKeyed(value, ({ fieldPath, key, parent, path, text }) => {
    const cls = classOf(key, parent, path);

    if (cls && isTranslatable(text)) out.push({ key: keyOf(kind, slug, fieldPath), kind, slug, fieldPath, cls, en: text });

    return text;
  }, prefix);

  return out;
}

export function extractKeyed(data: object, kinds: readonly string[]): KeyedString[] {
  const rows = data as Record<string, readonly { slug?: string }[] | undefined>;

  return kinds.flatMap((kind) => (rows[kind] ?? []).flatMap((row) => (row.slug ? keyedOf(kind, row.slug, row) : [])));
}

export function rulesKeyed(rules: unknown): KeyedString[] {
  const tables = rules && typeof rules === "object" ? (rules as Record<string, unknown>).tables : undefined;

  return tables ? keyedOf("rules", "_", tables) : [];
}

export const hasEntry = (tr: TranslationsV2, key: string): boolean => Object.hasOwn(tr, key);

export function statusOf(catalog: readonly KeyedString[], tr: TranslationsV2): Record<EntryStatus, string[]> {
  const out: Record<EntryStatus, string[]> = { ok: [], stale: [], missing: [], orphan: [] };

  const known = new Set<string>();

  for (const entry of catalog) {
    known.add(entry.key);

    if (!hasEntry(tr, entry.key)) out.missing.push(entry.key);
    else if (tr[entry.key].en === entry.en) out.ok.push(entry.key);
    else out.stale.push(entry.key);
  }

  out.orphan = Object.keys(tr).filter((key) => !known.has(key));

  return out;
}
