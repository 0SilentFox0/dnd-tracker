import { PINNED_INITIATIVE } from '@/lib/utils/battle/turn/initiative-constants';
import { getAbilityModifier } from '@/lib/utils/common/calculations';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { InitiativeScore } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

const INITIATIVE_DIE = 20;

/** `static` = the stored base; `roll` = d20 + DEX modifier + bonus (pinned bases stay static). */
export function d20Initiative(
    p: BattleParticipant,
    ctx: { rules: Pick<Ruleset, 'initiative'>; rng: Rng; roll?: boolean }
): InitiativeScore {
    const { baseInitiative, dexterity, initiativeBonus = 0 } = p.abilities;

    if (
        !(ctx.roll ?? ctx.rules.initiative.mode === 'roll') ||
        baseInitiative >= PINNED_INITIATIVE
    )
        return { total: baseInitiative, roll: null, die: null };

    const roll = rollDie(INITIATIVE_DIE, ctx.rng);

    return {
        total: roll + getAbilityModifier(dexterity) + initiativeBonus,
        roll,
        die: INITIATIVE_DIE,
    };
}

export const d20TieBreak = (p: BattleParticipant): number =>
    p.abilities.dexterity;
