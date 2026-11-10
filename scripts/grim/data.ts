import * as fs from "fs";
import * as path from "path";

import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";
import type { RulesetPatch } from "@/lib/utils/rules/schema";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";

export const GRIM_DATA_DIR = process.env.GRIM_DATA_DIR ?? path.join(process.cwd(), "data/templates/grim-d100");

/** Import order: a kind comes after every kind it links to by name (units -> races, spells) */
export const GRIM_ROW_KINDS = ["feats", "careers", "races", "spells", "units", "artifacts"] as const;

export type GrimRowKind = (typeof GRIM_ROW_KINDS)[number];

export type Row = Record<string, unknown>;

export const DESCRIPTION_MAX = 200;

export const descriptionIssues = (row: Row): string[] => (typeof row.description !== "string" || row.description.length < 1 || row.description.length > DESCRIPTION_MAX ? [`description must be 1–${DESCRIPTION_MAX} characters`] : []);

/** A species profile whose `careerId`/`talents`/`featId` hold names; the loader resolves them to ids */
export type NamedProfile = SpeciesProfile;

export type GrimData = Record<GrimRowKind, Row[]> & { raceProfiles: Array<{ race: string; profile: NamedProfile }>; rules?: RulesetPatch };


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
