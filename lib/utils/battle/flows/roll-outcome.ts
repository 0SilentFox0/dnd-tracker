import type { AttackMode, RollOutcome } from './attack-flow';
import type { AttackContext } from './forced-for';

import { predictAttack } from '@/lib/utils/battle/attack/bonus';
import { critThresholdOf } from '@/lib/utils/battle/attack/crit-threshold';
import { resolveAttackRoll } from '@/lib/utils/battle/common/attack-roll-helpers';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export interface RollInput {
    d20: number;
    second?: number;
    mode: AttackMode;
}

/** Результат кидка атаки проти поточного КБ цілі. */
export function rollOutcomeOf(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    ctx: AttackContext,
    roll: RollInput
): RollOutcome {
    const { totalBonus, targetAC } = predictAttack(
        attacker,
        target,
        attack,
        ctx.order,
        { round: ctx.round, map: ctx.map, rules: ctx.rules }
    );

    const crit = ctx.rules.criticals;

    const { d20, second, mode } = roll;

    const r = resolveAttackRoll(
        {
            attackRoll: d20,
            ...(mode === 'advantage' &&
                second !== undefined && { advantageRoll: second }),
            ...(mode === 'disadvantage' &&
                second !== undefined && { disadvantageRoll: second }),
        },
        targetAC,
        totalBonus,
        {
            critOn: critThresholdOf(
                ctx.rules,
                ctx.order,
                attacker.basicInfo.id
            ),
            fumbleOn: crit.fumbleOn,
        }
    );

    return r.crit ? 'crit' : r.critFail ? 'critFail' : r.hit ? 'hit' : 'miss';
}
