import * as fs from "fs";
import * as path from "path";

import { readTranslations } from "../../templates/lib/i18n-store";
import { SRD_CREDITS } from "./credits";
import { OPEN5E_PATH, OPEN5E_REPO, OPEN5E_SHA, SRD_DATA_DIR } from "./source";
import { SRD_KINDS, type SrdData } from "./types";

import { DEFAULT_TEMPLATE_LOCALE } from "@/lib/constants/campaigns";
import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";
import { applyOverlay } from "@/lib/utils/templates/i18n/overlay";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";

const fileOf = (dir: string, name: string) => path.join(dir, `${name}.json`);

const write = (file: string, value: unknown) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export function writeSrdData(data: SrdData, dir: string): TemplateManifest {
  fs.mkdirSync(dir, { recursive: true });

  for (const kind of SRD_KINDS) write(fileOf(dir, kind), data[kind]);

  const manifest: TemplateManifest = {
    key: "srd-5.2",
    system: "dnd5e",
    names: { en: "5e SRD 5.2", uk: "5e SRD 5.2" },
    locales: ["en", "uk"],
    rules: { file: "rules.json" },
    kinds: SRD_KINDS,
    icons: {},
    compendium: true,
    source: { repo: OPEN5E_REPO, path: OPEN5E_PATH, sha: OPEN5E_SHA, license: "CC-BY-4.0" },
    credits: SRD_CREDITS,
    counts: Object.fromEntries(SRD_KINDS.map((k) => [k, data[k].length])),
  };

  write(fileOf(dir, "manifest"), manifest);

  return manifest;
}

const readEnglish = (dir: string): SrdData => Object.fromEntries(SRD_KINDS.map((k) => [k, JSON.parse(fs.readFileSync(fileOf(dir, k), "utf8"))])) as SrdData;

export const readSrdData = (dir = SRD_DATA_DIR, locale?: string): SrdData => {
  const data = readEnglish(dir);

  return locale && locale !== DEFAULT_TEMPLATE_LOCALE ? applyOverlay(data, readTranslations(path.basename(dir), locale, path.dirname(dir)), SRD_KINDS) : data;
};

export const readSrdManifest = (dir = SRD_DATA_DIR): TemplateManifest => TemplateManifestSchema.parse(JSON.parse(fs.readFileSync(fileOf(dir, "manifest"), "utf8")));

export const toImportRows = (rows: ReadonlyArray<{ slug: string }>): Record<string, unknown>[] => rows.map((row) => ({ ...row }));
