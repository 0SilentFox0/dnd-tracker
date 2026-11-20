import { editionOf } from '../edition';
import { qualityFast } from '../equipment/quality-effects';
import { ATTACK_SLOT } from '../slots';
import { canonWeaponUse } from './weapon-use';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { PINNED_INITIATIVE } from '@/lib/utils/battle/turn/initiative-constants';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { InitiativeScore } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

const INITIATIVE_DIE = 10;

const TENS = 10;

const FAST_INITIATIVE = 2;

/** Canon Fast: +2 with a Fast melee weapon unless two weapons are in hand (p304) */
function fastBonus(p: BattleParticipant): number {
    const melee = (p.battleData?.attacks ?? []).filter(
        (a) => attackKindOf(a.type) !== AttackType.RANGED
    );

    const slots = melee.map((a) => ATTACK_SLOT.read(a.system));

    const off = slots.filter((s) => s?.hand === 'off').length;

    if (off > 0 && off < slots.length) return 0;

    return melee.some((a) => qualityFast(canonWeaponUse(p, a).refs, 'canon'))
        ? FAST_INITIATIVE
        : 0;
}

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

    const fast = edition.gearModel === 'canon' ? fastBonus(p) : 0;

    return { total: base + roll + fast, roll, die: INITIATIVE_DIE };
}
