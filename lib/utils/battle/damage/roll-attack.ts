import { attackDamageContext, attackDamageParts } from './attack-parts';
import { applyHeroDmDamageMultiplier } from './hero-dm-multiplier';
import { calculateDamageWithModifiers } from './index';

import {
    attackAbilityOf,
    attackDamageModifier,
} from '@/lib/utils/battle/attack/ability';
import { critDoublesDice } from '@/lib/utils/battle/attack/crit-dice';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { parseDiceLenient, rollGroups } from '@/lib/utils/common/dice';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export interface RolledAttackDamage {
    dice: { sides: number; value: number }[];
    flat: number;
    total: number;
    doubled: boolean;
}

export function rollAttackDamage(
    p: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset,
    opts: { rng: () => number; crit: boolean }
): RolledAttackDamage {
    const { formula } = attackDamageParts(p, attack, rules);

    const doubled = opts.crit && critDoublesDice(rules, true);

    const groups = (formula.trim() ? parseDiceLenient(formula).groups : []).map(
        (g) => (doubled ? { ...g, count: g.count * 2 } : g)
    );

    const rolls = rollGroups(groups, opts.rng);

    const dice = groups.flatMap((g, gi) => {
        const before = groups
            .slice(0, gi)
            .reduce((sum, prev) => sum + prev.count, 0);

        return rolls
            .slice(before, before + g.count)
            .map((value) => ({ sides: g.size, value }));
    });

    const statMod = attackDamageModifier(p, attack, rules, [p]);

    const calc = calculateDamageWithModifiers(
        p,
        rolls.reduce((sum, r) => sum + r, 0),
        statMod,
        attackKindOf(attack.type),
        {
            allParticipants: [p],
            ...attackDamageContext(p, attack, rolls, rules),
            statKey: attackAbilityOf(rules, p, attack).key,
        }
    );

    const { damage } = applyHeroDmDamageMultiplier(
        p,
        attackKindOf(attack.type),
        calc.totalDamage + (attack.damageBonus ?? 0)
    );

    const diceSum = rolls.reduce((sum, r) => sum + r, 0);

    return { dice, flat: damage - diceSum, total: damage, doubled };
}
