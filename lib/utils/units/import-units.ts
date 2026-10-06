import type { Prisma, PrismaClient } from "@prisma/client";

import type { ImportUnitRow } from "@/lib/schemas/units";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { specialAbilitiesToAbilities } from "@/lib/utils/units/special-abilities";
import type { UnitImportResult } from "@/types/import";

export interface ImportDb {
  race: Pick<PrismaClient["race"], "findMany">;
  unit: Pick<PrismaClient["unit"], "findMany" | "createMany">;
}

const nameKey = (name: string) => name.trim().toLocaleLowerCase("uk");

export function resolveImportRaces(names: Array<string | undefined>, races: Array<{ id: string; name: string }>) {
  const byName = new Map<string, string>();

  for (const race of races) {
    if (!byName.has(nameKey(race.name))) byName.set(nameKey(race.name), race.id);
  }

  const unknown = new Map<string, string>();

  for (const name of names) {
    if (name?.trim() && !byName.has(nameKey(name)) && !unknown.has(nameKey(name))) unknown.set(nameKey(name), name.trim());
  }

  return {
    raceIdOf: (name?: string): string | null => (name?.trim() ? (byName.get(nameKey(name)) ?? null) : null),
    unknownRaces: [...unknown.values()],
  };
}

export function toUnitCreateData(campaignId: string, unit: ImportUnitRow, raceId: string | null): Prisma.UnitCreateManyInput {
  return {
    campaignId,
    name: unit.name,
    raceId,
    level: unit.level,
    strength: unit.strength,
    dexterity: unit.dexterity,
    constitution: unit.constitution,
    intelligence: unit.intelligence,
    wisdom: unit.wisdom,
    charisma: unit.charisma,
    armorClass: unit.armorClass,
    initiative: unit.initiative,
    speed: unit.speed,
    maxHp: unit.maxHp,
    proficiencyBonus: unit.proficiencyBonus,
    attacks: unit.attacks as Prisma.InputJsonValue,
    abilities: abilitiesJson(specialAbilitiesToAbilities(unit.specialAbilities)),
    knownSpells: unit.knownSpells,
    avatar: unit.avatar ?? null,
  };
}

export async function importUnitsIntoCampaign(db: ImportDb, campaignId: string, rows: ImportUnitRow[]): Promise<UnitImportResult> {
  const races = await db.race.findMany({ where: { campaignId }, select: { id: true, name: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

  const { raceIdOf, unknownRaces } = resolveImportRaces(rows.map((r) => r.raceName), races);

  const existing = await db.unit.findMany({ where: { campaignId, name: { in: rows.map((r) => r.name) } }, select: { name: true } });

  const taken = new Set(existing.map((u) => u.name));

  const data = rows.filter((r) => !taken.has(r.name)).map((r) => toUnitCreateData(campaignId, r, raceIdOf(r.raceName)));

  const { count } = data.length > 0 ? await db.unit.createMany({ data }) : { count: 0 };

  return { imported: count, total: rows.length, skipped: rows.length - data.length, unknownRaces };
}
