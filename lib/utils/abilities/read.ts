import type { Prisma } from "@prisma/client";

import { type Ability, AbilitySchema, type ConversionIssue, parseAbilities } from "@/lib/utils/abilities/schema";
import { readChoices } from "@/lib/utils/characters/choices/read";
import type { Choice } from "@/types/choices";
import type { ClassFeature } from "@/types/classes";

export const OwnerKind = { SKILL: "skill", RACE: "race", CLASS: "class", ARTIFACT: "artifact", ARTIFACT_SET: "artifactSet", UNIT: "unit", FEAT: "feat" } as const;

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

export const featAbilities = (row: OwnerRow) => read(row);

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

export function withAbilityIssues<R extends OwnerRow, B extends object = R>(kind: OwnerKind, row: R, base: B = row as unknown as B) {
  const { abilities, issues: abilityIssues } = readAbilities(kind, row);

  return { ...base, abilities, abilityIssues };
}

export function readChoiceList(raw: unknown): Choice[] {
  return readChoices(raw).map((c) =>
    c.options ? { ...c, options: c.options.map((o) => ({ ...o, abilities: read({ id: `choice-option@${c.id}.${o.id}`, abilities: o.abilities }) })) } : c,
  );
}

export function classFeatureAbilities(features: unknown): ClassFeature[] {
  if (!Array.isArray(features)) return [];

  return features.flatMap((f): ClassFeature[] => {
    if (!f || typeof f !== "object") return [];

    const { level, abilities, choices } = f as { level?: unknown; abilities?: unknown; choices?: unknown };

    if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 20) return [];

    const list = readChoiceList(choices);

    return [{ level, abilities: read({ id: `class-feature@${level}`, abilities }), ...(list.length > 0 && { choices: list }) }];
  });
}
