import { createHash } from "crypto";

import { readGrimData } from "../../grim/data";
import { grimCatalog, grimI18nIssues } from "../../grim/i18n";
import { packPath,readPack, TEMPLATES_DIR } from "./pack";

import type { TextClass } from "@/lib/utils/templates/i18n/catalog";
import { extractKeyed, type KeyedString, rulesKeyed, type TranslationsV2 } from "@/lib/utils/templates/i18n/keys";

export const hashText = (cls: TextClass, en: string) => createHash("sha1").update(`${cls}\0${en}`).digest("hex").slice(0, 10);

/** Pack-specific catalog preparation; moves to PACK_HOOKS in the import CLI part. */
const PREPARED: Record<string, { catalog(dir: string): KeyedString[]; issues(dir: string, tr: TranslationsV2): string[] }> = {
  "grim-d100": {
    catalog: (dir) => grimCatalog(readGrimData(packPath("grim-d100", "", dir))),
    issues: (dir, tr) => grimI18nIssues(readGrimData(packPath("grim-d100", "", dir)), tr),
  },
};

export function catalogOf(key: string, dir = TEMPLATES_DIR): KeyedString[] {
  const prepared = Object.hasOwn(PREPARED, key) ? PREPARED[key] : undefined;

  if (prepared) return prepared.catalog(dir);

  const pack = readPack(key, dir);

  return [...extractKeyed(pack.rows, Object.keys(pack.rows)), ...rulesKeyed(pack.rules)];
}

export const issuesOf = (key: string, tr: TranslationsV2, dir = TEMPLATES_DIR): string[] => (Object.hasOwn(PREPARED, key) ? PREPARED[key].issues(dir, tr) : []);

/** Every v1 hash fans out to all catalog keys with that class and English text. */
export function convertV1(catalog: readonly KeyedString[], v1: Record<string, string>): { v2: TranslationsV2; unmatched: string[] } {
  const v2: TranslationsV2 = {};

  const used = new Set<string>();

  for (const entry of catalog) {
    const hash = hashText(entry.cls, entry.en);

    if (Object.hasOwn(v1, hash)) {
      v2[entry.key] = { text: v1[hash], en: entry.en };
      used.add(hash);
    }
  }

  return { v2, unmatched: Object.keys(v1).filter((hash) => !used.has(hash)) };
}
