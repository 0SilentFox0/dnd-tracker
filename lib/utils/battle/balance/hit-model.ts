import type { getCharacterStats, UnitStats } from './index';

import { noSaves } from '@/lib/utils/battle/saves/none';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { RuleSystemCombat } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

export type HitModel = NonNullable<RuleSystemCombat['hitModel']>;

/** A system without its own hit model: an even matchup, one damage per hit */
export const noHitModel: HitModel = {
    offense: () => 0,
    defense: () => 0,
    winChance: () => 0.5,
    damage: () => 1,
    refHit: 0.5,
};

export const hitModelOf = (rules: Pick<Ruleset, 'system'>): HitModel => {
    const { combat } = ruleSystemOf(rules);

    return combat.hitModelFor?.(rules) ?? combat.hitModel ?? noHitModel;
};

const MELEE_KEY = 'melee:physical';

const finite = (n: number, fallback: number) =>
    Number.isFinite(n) ? n : fallback;

/** Character balance stats for a system with its own hit model: offense/defense stand in for to-hit/AC, damage is per hit against the reference target. */
export function hitModelHeroStats(
    p: BattleParticipant,
    model: HitModel
): ReturnType<typeof getCharacterStats> {
    const dpr = finite(model.damage(p), 1);

    const hp = Math.round(
        p.combatStats.maxHp * finite(model.durability?.(p) ?? 1, 1)
    );

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
        saves: { ...noSaves.modifiers(p), ...model.saves?.(p) },
        spellResist: {},
        dprBreakdown: {
            physicalDpr: dpr,
            meleeAvg: dpr,
            rangedAvg: 0,
            spellDpr: 0,
            nonMagicDpr: 0,
            logLines: [],
        },
    };
}

/** Library unit under a hit model: offense/defense replace d20 attack bonus/AC, damage is per hit. */
export function hitModelUnitStats(
    unit: UnitStats,
    p: BattleParticipant,
    model: HitModel
): UnitStats {
    const dpr = Math.max(1, finite(model.damage(p), unit.dpr));

    const { spell: _spell, ...rest } = unit;

    const hp = Math.max(
        1,
        Math.round(unit.hp * finite(model.durability?.(p) ?? 1, 1))
    );

    return {
        ...rest,
        hp,
        dpr,
        kpi: dpr / hp,
        ac: finite(model.defense(p), 0),
        attackBonus: finite(model.offense(p), 0),
        damageKey: MELEE_KEY,
    };
}
