import { arraySegments, hasEntry, type TranslationsV2 } from "./keys";

const placeholders = (text: string) => (text.match(/\{[^{}]+\}/g) ?? []).sort().join("\0");

/** A stale entry (the English text changed since) is still applied; a placeholder mismatch falls back to English. */
export function translateAt(tr: TranslationsV2, key: string, en: string): string {
  const translated = hasEntry(tr, key) ? tr[key].text : undefined;

  return translated !== undefined && placeholders(translated) === placeholders(en) ? translated : en;
}

interface NameRow { slug?: unknown; name?: unknown }

/** Validate before overlaying any rows, including a collision with an untranslated name. */
export function translatedNames(rows: readonly unknown[], kind: string, tr: TranslationsV2, scope: string, normalize: (name: string) => string = (name) => name, keyOf: (row: NameRow, index: number) => string | null = (row) => (typeof row.slug === "string" ? `${kind}/${row.slug}/name` : null)): Map<string, string> {
  const names = new Map<string, string>();

  const targets = new Map<string, { name: string; translated: string }>();

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || !("name" in row) || typeof row.name !== "string") return;

    const name = row.name;

    const key = keyOf(row as NameRow, index);

    const translated = key ? translateAt(tr, key, name) : name;

    const clash = targets.get(normalize(translated));

    // Existing equal names are unchanged by fallback and are not a new ambiguity.
    if (clash && normalize(clash.name) !== normalize(name) && (clash.translated !== clash.name || translated !== name)) {
      // This diagnostic is also consumed by the template i18n CLI.
      // eslint-disable-next-line no-restricted-syntax
      throw new Error(`Колізія назв (${scope}): "${clash.name}" і "${name}" → "${translated}"`);
    }

    targets.set(normalize(translated), { name, translated });

    if (translated !== name) names.set(normalize(name), translated);
  });

  return names;
}

export function attackNames(row: unknown, kind: string, tr: TranslationsV2): Map<string, string> {
  const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};

  const attacks = Array.isArray(record.attacks) ? record.attacks : [];

  const slug = typeof record.slug === "string" ? record.slug : null;

  const segments = arraySegments(attacks);

  return translatedNames(attacks, kind, tr, "unit attacks", (name) => name.toLowerCase(), (_attack, index) => (slug ? `${kind}/${slug}/attacks${segments[index]}.name` : null));
}
