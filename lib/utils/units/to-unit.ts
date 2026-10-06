import type { Prisma } from "@prisma/client";

import { abilitySummary } from "@/lib/utils/abilities/summary";
import type { Unit } from "@/types/units";

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export function toUnit(row: Prisma.UnitGetPayload<object>): Unit {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    raceId: row.raceId,
    level: row.level,
    strength: row.strength,
    dexterity: row.dexterity,
    constitution: row.constitution,
    intelligence: row.intelligence,
    wisdom: row.wisdom,
    charisma: row.charisma,
    armorClass: row.armorClass,
    initiative: row.initiative,
    speed: row.speed,
    maxHp: row.maxHp,
    proficiencyBonus: row.proficiencyBonus,
    minTargets: row.minTargets,
    maxTargets: row.maxTargets,
    attacks: list<Unit["attacks"][number]>(row.attacks),
    immunities: list<string>(row.immunities),
    knownSpells: list<string>(row.knownSpells),
    avatar: row.avatar,
    abilitySummary: abilitySummary("unit", row),
  };
}
