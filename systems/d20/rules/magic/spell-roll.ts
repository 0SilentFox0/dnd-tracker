import { rollDie } from '@/lib/utils/common/dice';
import type {
    RuleSystemMagic,
    SpellAttackRoll,
    SpellAttackRollCtx,
} from '@/lib/utils/rules/systems/types';
import { rollD20WithMode } from '@/systems/d20/rules/dice/roll-d20';

export function d20SpellAttackRoll(ctx: SpellAttackRollCtx): SpellAttackRoll {
    const { roll, rolls } = rollD20WithMode(
        ctx.mode,
        ctx.rng,
        ctx.presetRoll
    );

    const crit = roll >= ctx.critOn;

    const fumble = roll <= ctx.fumbleOn;

    return {
        roll,
        rolls,
        crit,
        fumble,
        hit: !fumble && (crit || roll + ctx.bonus >= ctx.ac),
    };
}

export const d20SaveCrit: NonNullable<RuleSystemMagic['saveCrit']> = (roll) =>
    roll === 20 ? 'success' : roll === 1 ? 'fail' : null;

export function d20ZoneAttack(ctx: {
    rng: () => number;
    bonus: number;
    ac: number;
}): { roll: number; hit: boolean } {
    const roll = rollDie(20, ctx.rng);

    return {
        roll,
        hit: roll === 20 || (roll !== 1 && roll + ctx.bonus >= ctx.ac),
    };
}
