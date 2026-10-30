import { SRD_KINDS, type SrdData, type SrdKind } from "../lib/types";
import { classOf, hashText, isTranslatable, mapStrings, REF_KEYS, type Translations } from "./catalog";

const translate = (tr: Translations, key: string, text: string) => {
  const cls = classOf(key);

  return cls && isTranslatable(text) ? (tr[hashText(cls, text)] ?? text) : text;
};

function nameMaps(data: SrdData, tr: Translations): Record<SrdKind, Map<string, string>> {
  const maps = {} as Record<SrdKind, Map<string, string>>;

  for (const kind of SRD_KINDS) {
    const map = new Map<string, string>();

    const byTranslation = new Map<string, string>();

    for (const { name } of data[kind] as Array<{ name: string }>) {
      const translated = translate(tr, "name", name);

      const clash = byTranslation.get(translated);

      if (clash !== undefined && clash !== name) throw new Error(`Колізія назв (${kind}): "${clash}" і "${name}" → "${translated}"`);

      byTranslation.set(translated, name);
      map.set(name, translated);
    }

    maps[kind] = map;
  }

  return maps;
}

export function applyOverlay(data: SrdData, tr: Translations): SrdData {
  const maps = nameMaps(data, tr);

  const out = {} as Record<SrdKind, unknown>;

  for (const kind of SRD_KINDS) {
    out[kind] = mapStrings(data[kind], (key, text) => {
      const refKind = REF_KEYS[key];

      return refKind ? (maps[refKind].get(text) ?? text) : translate(tr, key, text);
    });
  }

  return out as unknown as SrdData;
}
