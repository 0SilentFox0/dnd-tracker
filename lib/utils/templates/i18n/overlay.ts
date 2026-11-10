import { classOf, hashText, isTranslatable, mapStrings, REF_KEYS, SRD_KINDS, type Translations } from "./catalog";

const placeholders = (text: string) => (text.match(/\{[^{}]+\}/g) ?? []).sort().join("\0");

export function translateText(tr: Translations, key: string, text: string, parent = "", path: readonly string[] = []): string {
  const cls = classOf(key, parent, path);

  const translated = cls && isTranslatable(text) ? tr[hashText(cls, text)] : undefined;

  return translated !== undefined && placeholders(translated) === placeholders(text) ? translated : text;
}

/** Validate before overlaying any rows, including a collision with an untranslated name. */
export function translatedNames(rows: readonly unknown[], tr: Translations, scope: string, normalize: (name: string) => string = (name) => name): Map<string, string> {
  const names = new Map<string, string>();

  const targets = new Map<string, { name: string; translated: string }>();

  for (const row of rows) {
    if (!row || typeof row !== "object" || !("name" in row) || typeof row.name !== "string") continue;

    const name = row.name;

    const translated = translateText(tr, "name", name);

    const clash = targets.get(normalize(translated));

    // Existing equal names are unchanged by fallback and are not a new ambiguity.
    if (clash && normalize(clash.name) !== normalize(name) && (clash.translated !== clash.name || translated !== name)) {
      // This diagnostic is also consumed by the SRD CLI.
      // eslint-disable-next-line no-restricted-syntax
      throw new Error(`Колізія назв (${scope}): "${clash.name}" і "${name}" → "${translated}"`);
    }

    targets.set(normalize(translated), { name, translated });

    if (translated !== name) names.set(normalize(name), translated);
  }

  return names;
}

export function attackNames(row: unknown, tr: Translations): Map<string, string> {
  const attacks = row && typeof row === "object" && "attacks" in row && Array.isArray(row.attacks) ? row.attacks : [];

  return translatedNames(attacks, tr, "unit attacks", (name) => name.toLowerCase());
}

export function applyOverlay<T extends object>(source: T, tr: Translations): T {
  const data = source as unknown as Record<string, readonly unknown[]>;

  if (!Object.keys(tr).length) return source;

  const maps = Object.fromEntries(SRD_KINDS.map((kind) => [kind, translatedNames(data[kind], tr, kind, kind === "artifacts" ? (name) => name.trim().toLowerCase() : undefined)])) as Record<string, Map<string, string>>;

  const attacks = data.units.map((row) => attackNames(row, tr));

  const out: Record<string, unknown> = {};

  for (const kind of SRD_KINDS) {
    out[kind] = data[kind].map((row, index) => mapStrings(row, (key, text, parent, path) => {
      if (kind === "units" && parent === "perform" && key === "attack") return attacks[index].get(text.toLowerCase()) ?? text;

      const refKind = REF_KEYS[key];

      return refKind ? (maps[refKind].get(refKind === "artifacts" ? text.trim().toLowerCase() : text) ?? text) : translateText(tr, key, text, parent, path);
    }));
  }

  return out as unknown as T;
}
