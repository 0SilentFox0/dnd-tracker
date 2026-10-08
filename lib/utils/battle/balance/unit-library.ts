import type { Prisma } from "@prisma/client";

import { unitResistances } from "./resist";
import { getUnitStats, type UnitSpellInput, type UnitStats } from "./stats";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";

type RaceRow = Prisma.RaceGetPayload<object>;

type UnitAttacks = Array<{ damageDice?: string; type?: string; attackBonus?: number; targetType?: string; maxTargets?: number }>;

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
  armorClass?: number;
  proficiencyBonus?: number;
  attacks: unknown;
  knownSpells?: unknown;
}

export type UnitSpellRow = UnitSpellInput & { id: string };

export function unitRowStats(u: UnitStatsRow, spellsById: Map<string, UnitSpellRow> = new Map(), resist?: Record<string, number>): UnitStats {
  const known = Array.isArray(u.knownSpells) ? (u.knownSpells as unknown[]).filter((x): x is string => typeof x === "string") : [];

  const spells = known.map((id) => spellsById.get(id)).filter((s): s is UnitSpellRow => !!s);

  const stats = getUnitStats({ id: u.id, name: u.name, maxHp: u.maxHp, level: u.level, raceId: u.raceId, strength: u.strength, dexterity: u.dexterity, maxTargets: u.maxTargets, armorClass: u.armorClass, proficiencyBonus: u.proficiencyBonus, attacks: (u.attacks as UnitAttacks) || [], spells });

  return resist && Object.keys(resist).length > 0 ? { ...stats, resist } : stats;
}

/** Resistances from the participant the battle would build (unit and race abilities, immunities). */
export async function unitResistancesById(units: UnitFromPrisma[], races: RaceRow[]): Promise<Map<string, Record<string, number>>> {
  const racesById = Object.fromEntries(races.map((r) => [r.id, r]));

  const built = await Promise.all(units.map((u) => createBattleParticipantFromUnit(u, "", ParticipantSide.ENEMY, 1, racesById)));

  return new Map(built.map((p, i) => [units[i].id, unitResistances(p)]));
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
  const [rows, races] = await Promise.all([prisma.unit.findMany({ where: { campaignId } }), prisma.race.findMany({ where: { campaignId } })]);

  const [spellsById, resistById] = await Promise.all([loadSpellsForUnits(campaignId, rows), unitResistancesById(rows, races)]);

  return rows.map((u) => unitRowStats(u, spellsById, resistById.get(u.id)));
}
