import { participantStats } from '../combat/participant';
import { SIZE_DAMAGE_PER_STEP, SIZE_HIT_PER_STEP } from './constants';
import { sizeStep } from './read';

import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { BattleParticipant } from '@/types/battle';

const stepOf = (p: BattleParticipant) => sizeStep(participantStats(p)?.size);

export const sizeHitMod = (
    attacker: BattleParticipant,
    target: BattleParticipant
): number => SIZE_HIT_PER_STEP * Math.max(0, stepOf(target) - stepOf(attacker));

export const sizeDamageBonus = (
    attacker: BattleParticipant,
    target: BattleParticipant,
    base: number
): number =>
    SIZE_DAMAGE_PER_STEP *
    Math.max(0, stepOf(attacker) - stepOf(target)) *
    Math.max(0, base);

export function wardRoll(
    target: BattleParticipant,
    rng: Rng
): { roll: number; saved: boolean } | null {
    const ward = participantStats(target)?.ward;

    if (ward === undefined) return null;

    const roll = rollDie(10, rng);

    return { roll, saved: roll >= ward };
}
