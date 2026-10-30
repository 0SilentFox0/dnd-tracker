import type { CatalogEntry, Translations } from "./catalog";

export type NameMap = Map<string, string>;

const ITALIC = /(?<![*\p{L}\p{N}_])\*([^*\n]+)\*(?![*\p{L}\p{N}_])|(?<![\p{L}\p{N}_])_([^_\n]+)_(?![\p{L}\p{N}_])/gu;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildNameMap(catalog: CatalogEntry[], tr: Translations): NameMap {
  const map: NameMap = new Map();

  for (const e of catalog) if (e.cls === "n" && tr[e.hash] !== undefined) map.set(e.en, tr[e.hash]);

  return map;
}

export function namesIn(texts: string[], names: NameMap): Record<string, string> {
  const candidates = [...names.keys()].filter((n) => n.length >= 3 && /^\p{Lu}/u.test(n) && names.get(n) !== n).sort((a, b) => b.length - a.length);

  if (candidates.length === 0) return {};

  const re = new RegExp(`(?<![A-Za-z])(?:${candidates.map(escapeRe).join("|")})(?![A-Za-z])`, "g");

  const found: Record<string, string> = {};

  for (const text of texts) for (const [name] of text.matchAll(re)) found[name] = names.get(name) as string;

  return found;
}

interface Span {
  index: number;
  length: number;
  text: string;
  delim: string;
}

const spansOf = (text: string): Span[] =>
  [...text.matchAll(ITALIC)].map((m) => ({ index: m.index as number, length: m[0].length, text: m[1] ?? m[2], delim: m[0][0] }));

// Italic names are replaced by the catalog translation, aligned by order; only when span counts match and the span is not already a known translated name (reordering)
export function fixItalicNames(en: string, tr: string, names: NameMap): string {
  const [enSpans, trSpans] = [spansOf(en), spansOf(tr)];

  if (enSpans.length === 0 || enSpans.length !== trSpans.length) return tr;

  const translated = new Set(names.values());

  let out = tr;

  for (let i = trSpans.length - 1; i >= 0; i -= 1) {
    const wanted = names.get(enSpans[i].text);

    if (wanted !== undefined && !translated.has(trSpans[i].text)) {
      const s = trSpans[i];

      out = `${out.slice(0, s.index)}${s.delim}${wanted}${s.delim}${out.slice(s.index + s.length)}`;
    }
  }

  return out;
}
