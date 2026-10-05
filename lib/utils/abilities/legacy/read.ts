import type { Prisma } from "@prisma/client";

import { convertLegacyArtifact } from "./convert-artifact";
import { convertLegacyArtifactSet } from "./convert-artifact-set";
import { convertLegacyRace } from "./convert-race";
import { convertLegacySkill, type LegacySkillRow } from "./convert-skill";
import { convertLegacyUnit } from "./convert-unit";
import type { ConversionResult } from "./types";

import { type Ability, parseAbilities } from "@/lib/utils/abilities/schema";

function read<R extends { id: string; abilities?: unknown }>(row: R, convert: (r: R) => ConversionResult): Ability[] {
  const parsed = parseAbilities(row.abilities);

  if (parsed) return parsed;

  if (row.abilities !== null && row.abilities !== undefined) console.warn(`[abilities] invalid JSON for ${row.id}, using legacy conversion`);

  return convert(row).abilities;
}

export const skillAbilities = (row: LegacySkillRow & { abilities?: unknown }) => read(row, convertLegacySkill);

export const raceAbilities = (row: Parameters<typeof convertLegacyRace>[0] & { abilities?: unknown }) => read(row, (r) => convertLegacyRace(r));

export const artifactAbilities = (row: Parameters<typeof convertLegacyArtifact>[0] & { abilities?: unknown }) => read(row, (r) => convertLegacyArtifact(r));

export const artifactSetAbilities = (row: Parameters<typeof convertLegacyArtifactSet>[0] & { abilities?: unknown }) => read(row, (r) => convertLegacyArtifactSet(r));

export const unitAbilities = (row: Parameters<typeof convertLegacyUnit>[0] & { abilities?: unknown }) => read(row, convertLegacyUnit);

export function abilitiesJson(abilities: Ability[]): Prisma.InputJsonValue {
  return abilities as unknown as Prisma.InputJsonValue;
}
