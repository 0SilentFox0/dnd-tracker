import { unitResistances } from "./resist";
import { getUnitStats, type UnitSpellInput, type UnitStats } from "./stats";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { RaceRow } from "@/types/races";

type UnitAttacks = Array<{ damageDice?: string; type?: string; attackBonus?: number; targetType?: string; maxTargets?: number }>;

export const UNIT_SPELL_SELECT = { id: true, dice: true, targeting: true, resolution: true, spellEffects: true } as const;

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

/** Id юнітів, яких прикликають (`summon` з `unitId` в ефектах заклять чи вміннях). */
export function summonedUnitIds(sources: unknown[]): Set<string> {
  const out = new Set<string>();

  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;

      if (o.kind === "summon" && typeof o.unitId === "string") out.add(o.unitId);

      Object.values(o).forEach(walk);
    }
  };

  sources.forEach(walk);

  return out;
}

async function loadSummonSources(campaignId: string): Promise<unknown[]> {
  const spells = await prisma.spell.findMany({ where: { campaignId, spellEffects: { array_contains: [{ kind: "summon" }] } }, select: { spellEffects: true } });

  return spells.map((s) => s.spellEffects);
}

export async function loadUnitLibraryStats(campaignId: string): Promise<UnitStats[]> {
  const [rows, races, summonSources] = await Promise.all([prisma.unit.findMany({ where: { campaignId } }), prisma.race.findMany({ where: { campaignId } }), loadSummonSources(campaignId)]);

  const [spellsById, resistById] = await Promise.all([loadSpellsForUnits(campaignId, rows), unitResistancesById(rows, races)]);

  const summoned = summonedUnitIds([...summonSources, ...rows.map((u) => u.abilities), ...races.map((r) => r.abilities)]);

  return rows.map((u) => {
    const stats = unitRowStats(u, spellsById, resistById.get(u.id));

    return summoned.has(u.id) ? { ...stats, summon: true } : stats;
  });
}
