import type { Prisma } from "@prisma/client";

import { convertLegacyArtifact } from "./convert-artifact";
import { convertLegacyArtifactSet } from "./convert-artifact-set";
import { convertLegacyRace } from "./convert-race";
import { convertLegacySkill, type LegacySkillRow } from "./convert-skill";
import { convertLegacyUnit } from "./convert-unit";
import type { ConversionIssue, ConversionResult } from "./types";

import { type Ability, AbilitySchema, parseAbilities } from "@/lib/utils/abilities/schema";

function read<R extends { id: string; abilities?: unknown }>(row: R, convert: (r: R) => ConversionResult): Ability[] {
  const parsed = parseAbilities(row.abilities);

  if (parsed) return parsed;

  if (Array.isArray(row.abilities)) {
    const valid = row.abilities.flatMap((a) => {
      const r = AbilitySchema.safeParse(a);

      return r.success ? [r.data] : [];
    });

    console.warn(`[abilities] ${row.abilities.length - valid.length} invalid abilities dropped for ${row.id}`);

    return valid;
  }

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
export type OwnerKind = "skill" | "race" | "artifact" | "artifactSet" | "unit";

const CONVERTERS: Record<OwnerKind, (row: never) => ConversionResult> = {
  skill: convertLegacySkill as never,
  race: ((r: never) => convertLegacyRace(r)) as never,
  artifact: ((r: never) => convertLegacyArtifact(r)) as never,
  artifactSet: ((r: never) => convertLegacyArtifactSet(r)) as never,
  unit: convertLegacyUnit as never,
};

export function readAbilities(kind: OwnerKind, row: { id: string; abilities?: unknown }): { abilities: Ability[]; issues: ConversionIssue[] } {
  const parsed = parseAbilities(row.abilities);

  if (parsed) return { abilities: parsed, issues: [] };

  // stored list stays authoritative: the editor shows broken entries instead of replacing them with legacy data
  if (Array.isArray(row.abilities)) {
    return {
      abilities: row.abilities.filter((a): a is Ability => !!a && typeof a === "object" && !Array.isArray(a)),
      issues: [{ severity: "loss", message: "Частина збережених вмінь має невалідні дані — виправте або видаліть їх перед збереженням" }],
    };
  }

  const converted = CONVERTERS[kind](row as never);

  const invalid = row.abilities !== null && row.abilities !== undefined;

  return {
    abilities: converted.abilities,
    issues: invalid ? [{ severity: "loss", message: "Дані вмінь у колонці невалідні — показано перенесене зі старого формату" }, ...converted.issues] : converted.issues,
  };
}
