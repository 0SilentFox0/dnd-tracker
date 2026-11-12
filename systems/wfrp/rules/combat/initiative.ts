import { PINNED_INITIATIVE } from '@/lib/utils/battle/turn/initiative-constants';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { InitiativeScore } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

const INITIATIVE_DIE = 10;

/** `static` = the Initiative characteristic; `roll` = I + d10 (pinned bases stay static). */
export function wfrpInitiative(
    p: BattleParticipant,
    ctx: { rules: Pick<Ruleset, 'initiative'>; rng: Rng }
): InitiativeScore {
    const { baseInitiative } = p.abilities;

    if (
        ctx.rules.initiative.mode !== 'roll' ||
        baseInitiative >= PINNED_INITIATIVE
    )
        return { total: baseInitiative, roll: null, die: null };

    const roll = rollDie(INITIATIVE_DIE, ctx.rng);

    return { total: baseInitiative + roll, roll, die: INITIATIVE_DIE };
}
