import { getUnitStats, type UnitSpellInput, type UnitStats } from "./stats";

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
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  cr?: number | null;
  xp?: number | null;
  multiattack?: number;
  maxTargets?: number;
  armorClass?: number;
  proficiencyBonus?: number;
  attacks: unknown;
  knownSpells?: unknown;
}

export type UnitSpellRow = UnitSpellInput & { id: string };

export function unitRowStats(u: UnitStatsRow, spellsById: Map<string, UnitSpellRow> = new Map(), resist?: Record<string, number>, saveDcBase?: number): UnitStats {
  const known = Array.isArray(u.knownSpells) ? (u.knownSpells as unknown[]).filter((x): x is string => typeof x === "string") : [];

  const spells = known.map((id) => spellsById.get(id)).filter((s): s is UnitSpellRow => !!s);

  const stats = getUnitStats({ id: u.id, name: u.name, maxHp: u.maxHp, level: u.level, raceId: u.raceId, strength: u.strength, dexterity: u.dexterity, intelligence: u.intelligence, wisdom: u.wisdom, charisma: u.charisma, cr: u.cr, xp: u.xp, multiattack: u.multiattack, maxTargets: u.maxTargets, armorClass: u.armorClass, proficiencyBonus: u.proficiencyBonus, attacks: (u.attacks as UnitAttacks) || [], spells, saveDcBase });

  return resist && Object.keys(resist).length > 0 ? { ...stats, resist } : stats;
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
