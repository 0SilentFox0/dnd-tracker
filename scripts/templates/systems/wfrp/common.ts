import type { Pack } from "../../lib/pack";

import type { RulesetPatch } from "@/lib/utils/rules/schema";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";

export const WFRP_ROW_KINDS = ["feats", "careers", "races", "spells", "units", "artifacts"] as const;

export type WfrpRowKind = (typeof WFRP_ROW_KINDS)[number];

export type Row = Record<string, unknown>;

export const DESCRIPTION_MAX = 200;

export const descriptionIssues = (row: Row): string[] => (typeof row.description !== "string" || row.description.length < 1 || row.description.length > DESCRIPTION_MAX ? [`description must be 1–${DESCRIPTION_MAX} characters`] : []);

/** A species profile whose `careerId`/`talents`/`featId` hold names; the importer resolves them to ids */
export type NamedProfile = SpeciesProfile;

export type WfrpData = Record<WfrpRowKind, Row[]> & { raceProfiles: Array<{ race: string; profile: NamedProfile }>; rules?: RulesetPatch };

export const wfrpDataOf = (pack: Pack): WfrpData => ({
  ...(Object.fromEntries(WFRP_ROW_KINDS.map((kind) => [kind, (pack.rows[kind] ?? []) as Row[]])) as Record<WfrpRowKind, Row[]>),
  raceProfiles: (pack.extras["race-profiles"] ?? []) as WfrpData["raceProfiles"],
  ...(pack.rules && { rules: pack.rules as unknown as RulesetPatch }),
});
