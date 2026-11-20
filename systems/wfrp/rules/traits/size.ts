import { participantStats } from '../combat/participant';
import type { EditionProfile } from '../edition';
import { TRAIT_SIZES, type TraitSize } from '../trait-kinds';
import {
    SIZE_DAMAGE_PER_STEP,
    SIZE_DAMAGE_SB,
    SIZE_HIT_PER_STEP,
    SIZE_OUTNUMBER_WEIGHT,
    SIZE_PARRY_SL,
    SIZE_RANGED_SL,
} from './constants';
import { sizeStep } from './read';

import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { BattleParticipant } from '@/types/battle';

const stepOf = (p: BattleParticipant) => sizeStep(participantStats(p)?.size);

type CanonModel = Pick<EditionProfile, 'combatModsModel'>;

const isCanon = (edition: CanonModel) => edition.combatModsModel === 'canon5e';

const SMALL_STEP = sizeStep('small');

/** The book has no Tiny or Little: they count as Small (p360) */
export const canonSizeStep = (p: BattleParticipant): number =>
    Math.max(stepOf(p), SMALL_STEP);

const canonSizeOf = (p: BattleParticipant): TraitSize =>
    TRAIT_SIZES[canonSizeStep(p)];

/** Ranged attack SL from size: larger target +1 (Monstrous +2), smaller -1 (p166) */
export function sizeRangedSl(
    attacker: BattleParticipant,
    target: BattleParticipant
): number {
    const diff = canonSizeStep(target) - canonSizeStep(attacker);

    if (diff === 0) return 0;

    if (diff < 0) return SIZE_RANGED_SL.smaller;

    return canonSizeOf(target) === 'monstrous'
        ? SIZE_RANGED_SL.monstrous
        : SIZE_RANGED_SL.larger;
}

/** Absolute bonus of the attacker's own size, not a difference to the target; never for ranged, free or extra attacks, nor for profiles that already include it (p360) */
export function canonSizeDamage(
    attacker: BattleParticipant,
    sb: number,
    opts: { ranged: boolean; free: boolean; baked: boolean }
): number {
    if (opts.ranged || opts.free || opts.baked) return 0;

    return (SIZE_DAMAGE_SB[canonSizeOf(attacker)] ?? 0) * Math.max(0, sb);
}

/** -2 SL to defend with Melee against a larger creature; dodging is free (p360) */
export const sizeParrySl = (
    defender: BattleParticipant,
    attacker: BattleParticipant,
    edition: CanonModel
): number =>
    isCanon(edition) && canonSizeStep(attacker) > canonSizeStep(defender)
        ? SIZE_PARRY_SL
        : 0;

/** How many creatures a fighter counts as when its side is checked for being outnumbered; 1 under the legacy model (p360) */
export const outnumberWeight = (
    p: BattleParticipant,
    edition: CanonModel
): number =>
    isCanon(edition) ? (SIZE_OUTNUMBER_WEIGHT[canonSizeOf(p)] ?? 1) : 1;

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
