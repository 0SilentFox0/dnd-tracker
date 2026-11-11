import * as fs from "fs";
import * as path from "path";

import { type Row, WFRP_ROW_KINDS, type WfrpData, type WfrpRowKind } from "../templates/systems/wfrp/common";

import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";
import type { RulesetPatch } from "@/lib/utils/rules/schema";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";

export const GRIM_DATA_DIR = process.env.GRIM_DATA_DIR ?? path.join(process.cwd(), "data/templates/grim-d100");

export { DESCRIPTION_MAX, descriptionIssues, type NamedProfile, type Row } from "../templates/systems/wfrp/common";

export const GRIM_ROW_KINDS = WFRP_ROW_KINDS;

export type GrimRowKind = WfrpRowKind;

export type GrimData = WfrpData;

const readJson = <T>(dir: string, name: string): T | undefined => {
  const file = path.join(dir, `${name}.json`);

  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : undefined;
};

export function readGrimData(dir: string = GRIM_DATA_DIR): GrimData {
  const rules = readJson<RulesetPatch>(dir, "rules");

  return {
    ...(Object.fromEntries(GRIM_ROW_KINDS.map((kind) => [kind, readJson<Row[]>(dir, kind) ?? []])) as Record<GrimRowKind, Row[]>),
    raceProfiles: readJson<GrimData["raceProfiles"]>(dir, "race-profiles") ?? [],
    ...(rules && { rules }),
  };
}

export const readGrimManifest = (dir: string = GRIM_DATA_DIR): TemplateManifest => TemplateManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")));
