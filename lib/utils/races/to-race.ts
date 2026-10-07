import type { Prisma } from "@prisma/client";

import type { Ability, ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Race } from "@/types/races";

type RaceRow = Omit<Prisma.RaceGetPayload<object>, "abilities"> & { abilities?: unknown };

export function toRace(row: RaceRow, extra: { abilities?: Ability[]; abilityIssues?: ConversionIssue[] } = {}): Race {
  const passive = row.passiveAbility;

  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    icon: row.icon,
    color: row.color,
    ...extra,
    availableSkills: Array.isArray(row.availableSkills) ? (row.availableSkills as string[]) : [],
    disabledSkills: Array.isArray(row.disabledSkills) ? (row.disabledSkills as string[]) : [],
    passiveAbility: passive && typeof passive === "object" && !Array.isArray(passive) ? (passive as unknown as Race["passiveAbility"]) : null,
    spellSlotProgression: Array.isArray(row.spellSlotProgression) ? (row.spellSlotProgression as unknown as Race["spellSlotProgression"]) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
