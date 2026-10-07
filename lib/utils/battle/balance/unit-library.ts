import { getUnitStats, type UnitStats } from "./stats";

import { prisma } from "@/lib/db";

type UnitAttacks = Array<{ damageDice?: string; type?: string }>;

export function unitRowStats(u: { id: string; name: string; maxHp: number; level: number; raceId: string | null; strength: number; dexterity: number; attacks: unknown }): UnitStats {
  return getUnitStats({ id: u.id, name: u.name, maxHp: u.maxHp, level: u.level, raceId: u.raceId, strength: u.strength, dexterity: u.dexterity, attacks: (u.attacks as UnitAttacks) || [] });
}

export async function loadUnitLibraryStats(campaignId: string): Promise<UnitStats[]> {
  const rows = await prisma.unit.findMany({
    where: { campaignId },
    select: { id: true, name: true, maxHp: true, level: true, raceId: true, strength: true, dexterity: true, attacks: true },
  });

  return rows.map(unitRowStats);
}
