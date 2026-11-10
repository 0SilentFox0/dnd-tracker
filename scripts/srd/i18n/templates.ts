import { readSrdData } from "../lib/data-files";
import { type CatalogEntry, extractCatalog, type Translations } from "./catalog";
import { I18N_DIR } from "./store";

import { readGrimData } from "@/scripts/grim/data";
import { GRIM_I18N_DIR, grimCatalog, grimI18nIssues } from "@/scripts/grim/i18n";

export interface I18nTemplate {
  dir: string;
  catalog(): CatalogEntry[];
  issues(tr: Translations): string[];
}

export const I18N_TEMPLATES: Record<"srd" | "grim", I18nTemplate> = {
  srd: { dir: I18N_DIR, catalog: () => extractCatalog(readSrdData()), issues: () => [] },
  grim: { dir: GRIM_I18N_DIR, catalog: () => grimCatalog(readGrimData()), issues: (tr) => grimI18nIssues(readGrimData(), tr) },
};

export function templateOf(args: string[]): { template: I18nTemplate; rest: string[] } {
  const at = args.indexOf("--template");

  if (at === -1) return { template: I18N_TEMPLATES.srd, rest: args };

  const name = args[at + 1];

  if (name !== "srd" && name !== "grim") throw new Error(`--template має бути srd або grim, отримано: ${name}`);

  return { template: I18N_TEMPLATES[name], rest: args.filter((_, i) => i !== at && i !== at + 1) };
}
