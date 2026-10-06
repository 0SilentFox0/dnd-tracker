import type { Prisma } from "@prisma/client";

import { type Ability, AbilitySchema, type ConversionIssue, parseAbilities } from "@/lib/utils/abilities/schema";

export const OwnerKind = { SKILL: "skill", RACE: "race", ARTIFACT: "artifact", ARTIFACT_SET: "artifactSet", UNIT: "unit" } as const;

export type OwnerKind = (typeof OwnerKind)[keyof typeof OwnerKind];

type OwnerRow = { id: string; abilities?: unknown };

function read(row: OwnerRow): Ability[] {
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

  if (row.abilities !== null && row.abilities !== undefined) console.warn(`[abilities] invalid JSON for ${row.id}`);

  return [];
}

export const skillAbilities = (row: OwnerRow) => read(row);

export const raceAbilities = (row: OwnerRow) => read(row);

export const artifactAbilities = (row: OwnerRow) => read(row);

export const artifactSetAbilities = (row: OwnerRow) => read(row);

export const unitAbilities = (row: OwnerRow) => read(row);

export function abilitiesJson(abilities: Ability[]): Prisma.InputJsonValue {
  return abilities as unknown as Prisma.InputJsonValue;
}

export function readAbilities(_kind: OwnerKind, row: OwnerRow): { abilities: Ability[]; issues: ConversionIssue[] } {
  const parsed = parseAbilities(row.abilities);

  if (parsed) return { abilities: parsed, issues: [] };

  // stored list stays authoritative: the editor shows broken entries instead of dropping them
  if (Array.isArray(row.abilities)) {
    return {
      abilities: row.abilities.filter((a): a is Ability => !!a && typeof a === "object" && !Array.isArray(a)),
      issues: [{ severity: "loss", message: "Частина збережених вмінь має невалідні дані — виправте або видаліть їх перед збереженням" }],
    };
  }

  if (row.abilities !== null && row.abilities !== undefined) {
    return { abilities: [], issues: [{ severity: "loss", message: "Дані вмінь у колонці невалідні — список порожній" }] };
  }

  return { abilities: [], issues: [] };
}
