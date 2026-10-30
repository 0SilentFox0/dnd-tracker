import * as fs from "fs";
import * as path from "path";

import { SRD_DATA_DIR } from "../lib/source";
import type { Translations } from "./catalog";

export const I18N_DIR = path.join(SRD_DATA_DIR, "i18n");

const translationsFile = (locale: string, dir = I18N_DIR) => path.join(dir, `${locale}.json`);

export function readTranslations(locale: string, dir = I18N_DIR): Translations {
  const file = translationsFile(locale, dir);

  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Translations) : {};
}

export function writeTranslations(locale: string, tr: Translations, dir = I18N_DIR) {
  fs.mkdirSync(dir, { recursive: true });

  const sorted = Object.fromEntries(Object.entries(tr).sort(([a], [b]) => a.localeCompare(b)));

  fs.writeFileSync(translationsFile(locale, dir), `${JSON.stringify(sorted, null, 2)}\n`);
}

export const listLocales = (dir = I18N_DIR): string[] => ["en", ...(fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : [])];

export const readGlossary = (locale: string, dir = I18N_DIR): Record<string, string> => {
  const file = path.join(dir, "glossary", `${locale}.json`);

  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>) : {};
};
