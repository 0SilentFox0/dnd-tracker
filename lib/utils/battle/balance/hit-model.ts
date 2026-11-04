import type { getCharacterStats, UnitStats } from "./index";

import type { RuleSystemCombat } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

export type HitModel = NonNullable<RuleSystemCombat["hitModel"]>;

const MELEE_KEY = "melee:physical";

const finite = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);

/** Character balance stats for a system with its own hit model: offense/defense stand in for to-hit/AC, damage is per hit against the reference target. */
export function hitModelHeroStats(p: BattleParticipant, model: HitModel): ReturnType<typeof getCharacterStats> {
  const dpr = finite(model.damage(p), 1);

  const hp = p.combatStats.maxHp;

  return {
    dpr,
    hp,
    level: p.abilities.level,
    kpi: hp > 0 ? dpr / hp : 0,
    spellDpr: 0,
    toHit: finite(model.offense(p), 0),
    ac: finite(model.defense(p), 0),
    weaponDpr: dpr,
    damageKey: MELEE_KEY,
    saves: p.abilities.modifiers,
    spellResist: {},
    dprBreakdown: { physicalDpr: dpr, meleeAvg: dpr, rangedAvg: 0, spellDpr: 0, nonMagicDpr: 0, logLines: [] },
  };
}

/** Library unit under a hit model: offense/defense replace d20 attack bonus/AC, damage is per hit. */
export function hitModelUnitStats(unit: UnitStats, p: BattleParticipant, model: HitModel): UnitStats {
  const dpr = Math.max(1, finite(model.damage(p), unit.dpr));

  const { spell: _spell, ...rest } = unit;

  return { ...rest, dpr, kpi: dpr / unit.hp, ac: finite(model.defense(p), 0), attackBonus: finite(model.offense(p), 0), damageKey: MELEE_KEY };
}
