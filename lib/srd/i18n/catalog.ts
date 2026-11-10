import { createHash } from "crypto";

import type { SrdData, SrdKind } from "@/scripts/srd/lib/types";

export const SRD_KINDS = ["spell-groups", "spells", "races", "classes", "feats", "backgrounds", "units", "artifacts"] as const;

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

// Paths omit array indices, so seed rows and DB rows share the same context.
export const classOf = (key: string, parent = "", path: readonly string[] = []): TextClass | null => {
  if (parent === "casting" && key === "text") return null;

  if (NAME_KEYS.includes(key)) return "n";

  if (TEXT_KEYS.includes(key)) return "d";

  if (key === "trigger" && parent === "casting") return "d";

  if ((key === "alignment" || key === "languages") && parent === "statblock") return "d";

  if (key === "properties" && (parent === "weapon" || parent === "attacks")) return "d";

  if (key === "toolProficiencies" && path.length === 1) return "d";

  if (["armor", "weapons", "tools"].includes(key) &&
    (path.join(".") === `proficiencies.${key}` || path.join(".") === `proficiencies.multiclass.${key}`)) return "d";

  if (key === "trappings" && parent === "tiers") return "d";

  if (key === "class" && path.length === 1) return "n";

  return null;
};

export const isTranslatable = (en: string) => /[A-Za-z]{3}/.test(en);

export function mapStrings(value: unknown, visit: (key: string, text: string, parent: string, path: readonly string[]) => string, key = "", parent = "", path: readonly string[] = []): unknown {
  if (typeof value === "string") return visit(key, value, parent, path);

  if (Array.isArray(value)) return value.map((v) => mapStrings(v, visit, key, parent, path));

  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, visit, k, key, [...path, k])]));

  return value;
}

export function extractCatalog(data: SrdData): CatalogEntry[] {
  const found = new Map<string, CatalogEntry>();

  for (const kind of SRD_KINDS) {
    mapStrings(data[kind], (key, text, parent, path) => {
      const cls = classOf(key, parent, path);

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
