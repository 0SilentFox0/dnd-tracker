import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { hitModelUnitStats } from "@/lib/utils/battle/balance/hit-model";
import { unitResistances } from "@/lib/utils/battle/balance/resist";
import type { UnitStats } from "@/lib/utils/battle/balance/stats";
import { summonedUnitIds, UNIT_SPELL_SELECT, unitRowStats, type UnitSpellRow } from "@/lib/utils/battle/balance/unit-library";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { RaceRow } from "@/types/races";

/** The participants the battle would build; resistances (unit and race abilities, immunities) and system hit models read them. */
async function builtUnitsById(units: UnitFromPrisma[], races: RaceRow[]): Promise<Map<string, BattleParticipant>> {
  const racesById = Object.fromEntries(races.map((r) => [r.id, r]));

  const built = await Promise.all(units.map((u) => createBattleParticipantFromUnit(u, "", ParticipantSide.ENEMY, 1, racesById)));

  return new Map(built.map((p, i) => [units[i].id, p]));
}

/** One narrow query for every spell the given units know. */
async function loadSpellsForUnits(campaignId: string, units: Array<{ knownSpells?: unknown }>): Promise<Map<string, UnitSpellRow>> {
  const ids = new Set<string>();

  for (const u of units) if (Array.isArray(u.knownSpells)) for (const id of u.knownSpells) if (typeof id === "string") ids.add(id);

  if (ids.size === 0) return new Map();

  const rows = await prisma.spell.findMany({ where: { campaignId, id: { in: [...ids] } }, select: UNIT_SPELL_SELECT });

  return new Map(rows.map((s) => [s.id, s as UnitSpellRow]));
}

async function loadSummonSources(campaignId: string): Promise<unknown[]> {
  const spells = await prisma.spell.findMany({ where: { campaignId, spellEffects: { array_contains: [{ kind: "summon" }] } }, select: { spellEffects: true } });

  return spells.map((s) => s.spellEffects);
}

export async function loadUnitLibraryStats(campaignId: string, rules: Ruleset = DEFAULT_RULES): Promise<UnitStats[]> {
  const [rows, races, summonSources] = await Promise.all([prisma.unit.findMany({ where: { campaignId } }), prisma.race.findMany({ where: { campaignId } }), loadSummonSources(campaignId)]);

  const [spellsById, builtById] = await Promise.all([loadSpellsForUnits(campaignId, rows), builtUnitsById(rows, races)]);

  const model = ruleSystemOf(rules).combat.hitModel;

  const summoned = summonedUnitIds([...summonSources, ...rows.map((u) => u.abilities), ...races.map((r) => r.abilities)]);

  return rows.map((u) => {
    const built = builtById.get(u.id);

    const base = unitRowStats(u, spellsById, built && unitResistances(built), rules.formulas.saveDcBase);

    const stats = model && built ? hitModelUnitStats(base, built, model) : base;

    return summoned.has(u.id) ? { ...stats, summon: true } : stats;
  });
}
