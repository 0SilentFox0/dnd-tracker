import { createHash } from "crypto";

import { SRD_KINDS, type SrdData, type SrdKind } from "../lib/types";

export const NAME_KEYS: readonly string[] = ["name", "label", "nameTemplate"];

export const TEXT_KEYS: readonly string[] = ["description", "text", "equipmentText"];

export const REF_KEYS: Readonly<Record<string, SrdKind>> = {
  spellId: "spells",
  groupId: "spell-groups",
  school: "spell-groups",
  lists: "classes",
  spellList: "classes",
  originFeatId: "feats",
  bases: "artifacts",
};

export type TextClass = "n" | "d";

export interface CatalogEntry {
  hash: string;
  cls: TextClass;
  en: string;
  kinds: SrdKind[];
}

export type Translations = Record<string, string>;

export const hashText = (cls: TextClass, en: string) => createHash("sha1").update(`${cls}\0${en}`).digest("hex").slice(0, 10);

export const classOf = (key: string): TextClass | null => (NAME_KEYS.includes(key) ? "n" : TEXT_KEYS.includes(key) ? "d" : null);

export const isTranslatable = (en: string) => /[A-Za-z]{3}/.test(en);

export function mapStrings(value: unknown, visit: (key: string, text: string) => string, key = ""): unknown {
  if (typeof value === "string") return visit(key, value);

  if (Array.isArray(value)) return value.map((v) => mapStrings(v, visit, key));

  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, visit, k)]));

  return value;
}

export function extractCatalog(data: SrdData): CatalogEntry[] {
  const found = new Map<string, CatalogEntry>();

  for (const kind of SRD_KINDS) {
    mapStrings(data[kind], (key, text) => {
      const cls = classOf(key);

      if (cls && isTranslatable(text)) {
        const hash = hashText(cls, text);

        const entry = found.get(hash) ?? { hash, cls, en: text, kinds: [] };

        if (!entry.kinds.includes(kind)) entry.kinds.push(kind);

        found.set(hash, entry);
      }

      return text;
    });
  }

  return [...found.values()];
}
