import { getUnitStats, type UnitSpellInput, type UnitStats } from "./stats";

import { prisma } from "@/lib/db";

type UnitAttacks = Array<{ damageDice?: string; type?: string; targetType?: string; maxTargets?: number }>;

export const UNIT_SPELL_SELECT = { id: true, dice: true, targeting: true, spellEffects: true } as const;

export interface UnitStatsRow {
  id: string;
  name: string;
  maxHp: number;
  level: number;
  raceId: string | null;
  strength: number;
  dexterity: number;
  maxTargets?: number;
  attacks: unknown;
  knownSpells?: unknown;
}

export type UnitSpellRow = UnitSpellInput & { id: string };

export function unitRowStats(u: UnitStatsRow, spellsById: Map<string, UnitSpellRow> = new Map()): UnitStats {
  const known = Array.isArray(u.knownSpells) ? (u.knownSpells as unknown[]).filter((x): x is string => typeof x === "string") : [];

  const spells = known.map((id) => spellsById.get(id)).filter((s): s is UnitSpellRow => !!s);

  return getUnitStats({ id: u.id, name: u.name, maxHp: u.maxHp, level: u.level, raceId: u.raceId, strength: u.strength, dexterity: u.dexterity, maxTargets: u.maxTargets, attacks: (u.attacks as UnitAttacks) || [], spells });
}

/** One narrow query for every spell the given units know. */
export async function loadSpellsForUnits(campaignId: string, units: Array<{ knownSpells?: unknown }>): Promise<Map<string, UnitSpellRow>> {
  const ids = new Set<string>();

  for (const u of units) if (Array.isArray(u.knownSpells)) for (const id of u.knownSpells) if (typeof id === "string") ids.add(id);

  if (ids.size === 0) return new Map();

  const rows = await prisma.spell.findMany({ where: { campaignId, id: { in: [...ids] } }, select: UNIT_SPELL_SELECT });

  return new Map(rows.map((s) => [s.id, s as UnitSpellRow]));
}

export async function loadUnitLibraryStats(campaignId: string): Promise<UnitStats[]> {
  const rows = await prisma.unit.findMany({
    where: { campaignId },
    select: { id: true, name: true, maxHp: true, level: true, raceId: true, strength: true, dexterity: true, maxTargets: true, attacks: true, knownSpells: true },
  });

  const spellsById = await loadSpellsForUnits(campaignId, rows);

  return rows.map((u) => unitRowStats(u, spellsById));
}
