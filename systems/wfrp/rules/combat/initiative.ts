import { editionOf } from '../edition';

import { PINNED_INITIATIVE } from '@/lib/utils/battle/turn/initiative-constants';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { InitiativeScore } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

const INITIATIVE_DIE = 10;

const TENS = 10;

/** `static` = the Initiative characteristic; `roll` = (I or its tens bonus, by edition) + d10; pinned bases stay static. */
export function wfrpInitiative(
    p: BattleParticipant,
    ctx: {
        rules: Pick<Ruleset, 'initiative'> & { edition?: unknown };
        rng: Rng;
        roll?: boolean;
    }
): InitiativeScore {
    const { baseInitiative } = p.abilities;

    const edition = editionOf(ctx.rules);

    const rolled =
        ctx.roll ??
        (edition.initiativeRolled || ctx.rules.initiative.mode === 'roll');

    if (!rolled || baseInitiative >= PINNED_INITIATIVE)
        return { total: baseInitiative, roll: null, die: null };

    const roll = rollDie(INITIATIVE_DIE, ctx.rng);

    const base =
        edition.initiativeBase === 'bonus'
            ? Math.floor(baseInitiative / TENS)
            : baseInitiative;

    return { total: base + roll, roll, die: INITIATIVE_DIE };
}
