import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { createUnitSchema } from "@/lib/schemas/units";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { resolveUnitProficiency } from "@/lib/utils/units/monster";

export type CreateUnitData = z.infer<typeof createUnitSchema>;

export function unitCreateData(campaignId: string, data: CreateUnitData): Prisma.UnitUncheckedCreateInput {
  return {
    campaignId,
    name: data.name,
    raceId: data.raceId ?? null,
    level: data.level,
    strength: data.strength,
    dexterity: data.dexterity,
    constitution: data.constitution,
    intelligence: data.intelligence,
    wisdom: data.wisdom,
    charisma: data.charisma,
    armorClass: data.armorClass,
    initiative: data.initiative,
    speed: data.speed,
    gridSize: data.gridSize,
    maxHp: data.maxHp,
    proficiencyBonus: resolveUnitProficiency(data),
    minTargets: data.minTargets,
    maxTargets: data.maxTargets,
    attacks: data.attacks as Prisma.InputJsonValue,
    ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
    immunities: data.immunities as Prisma.InputJsonValue,
    knownSpells: data.knownSpells,
    morale: data.morale,
    avatar: data.avatar ?? null,
    cr: data.cr ?? null,
    xp: data.xp ?? null,
    multiattack: data.multiattack,
    legendaryActions: data.legendaryActions,
    legendaryResistances: data.legendaryResistances,
    saveProficiencies: data.saveProficiencies as Prisma.InputJsonValue,
  };
}
