import { formulaContext, resolveFlat } from './flat';
import type { Rng } from './types';

import type { Amount } from '@/lib/utils/abilities/schema';
import { evaluateFormula } from '@/lib/utils/battle/common/formula-evaluator';
import { averageAttackDamage } from '@/lib/utils/battle/damage/average';
import { rollDice } from '@/lib/utils/common/dice';
import type { BattleParticipant } from '@/types/battle';

export { FORMULA_VARIABLES, resolveFlat } from './flat';

function percentBase(
    of: 'eventDamage' | 'maxHp' | 'ownerAttack',
    input: {
        owner: BattleParticipant;
        target?: BattleParticipant;
        eventDamage?: number;
        participants?: BattleParticipant[];
    }
): number {
    if (of === 'eventDamage') return input.eventDamage ?? 0;

    if (of === 'maxHp') return (input.target ?? input.owner).combatStats.maxHp;

    const attack = input.owner.battleData.attacks?.[0];

    return attack
        ? averageAttackDamage(
              input.owner,
              attack,
              input.participants ?? [input.owner]
          ).total
        : 0;
}

export function resolveAmount(
    amount: Amount,
    input: {
        owner: BattleParticipant;
        target?: BattleParticipant;
        eventDamage?: number;
        spellRoll?: number;
        rng: Rng;
        participants?: BattleParticipant[];
    }
): number {
    if (typeof amount === 'number') return amount;

    if (typeof amount === 'string') return rollDice(amount, input.rng);

    if ('scale' in amount) return 0;

    if ('formula' in amount)
        return Math.max(
            0,
            Math.floor(
                evaluateFormula(amount.formula, formulaContext(input.owner))
            )
        );

    if ('spellRoll' in amount) {
        const percent =
            typeof amount.spellRoll === 'number'
                ? amount.spellRoll
                : Math.max(
                      0,
                      Math.min(500, resolveFlat(amount.spellRoll, input.owner))
                  );

        return Math.floor(((input.spellRoll ?? 0) * percent) / 100);
    }

    const base = percentBase(amount.percentOf, input);

    return Math.floor((base * amount.value) / 100);
}
