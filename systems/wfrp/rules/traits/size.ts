import { participantStats } from '../combat/participant';
import { ATTACK_SLOT } from '../slots';
import { wfrpState } from '../state';
import { SIZE_DAMAGE_PER_STEP, SIZE_HIT_PER_STEP } from './constants';
import { isSwarm } from './creature';
import { type CanonSize, canonSizeOf, canonSizeStep, sizeStep } from './read';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

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

/** A Swarm ignores the rules for Size (p357) */
const sizeOf = (p: BattleParticipant) =>
    isSwarm(p) ? undefined : participantStats(p)?.size;

const canonStepOf = (p: BattleParticipant) => canonSizeStep(sizeOf(p));

export const canonSizeOfParticipant = (p: BattleParticipant): CanonSize =>
    canonSizeOf(sizeOf(p));

const MELEE_DAMAGE_SB_FACTOR: Record<CanonSize, number> = {
    small: 0,
    average: 0,
    large: 1,
    enormous: 1,
    monstrous: 2,
};

export const sizeSbFactor = (p: BattleParticipant): number =>
    MELEE_DAMAGE_SB_FACTOR[canonSizeOfParticipant(p)];

/** Size adds SB (Monstrous 2xSB) to melee damage; not to ranged, free or extra attacks (p360) */
export function sizeMeleeDamage(
    attacker: BattleParticipant,
    attack: BattleAttack,
    sb: number,
    offTurn = false
): number {
    if (attackKindOf(attack.type) === AttackType.RANGED || offTurn) return 0;

    if (
        ATTACK_SLOT.read(attack.system)?.free ||
        wfrpState(attacker).momentumAttack
    )
        return 0;

    return Math.max(0, sb) * sizeSbFactor(attacker);
}

/** Ranged: a bigger target is +1 SL (Monstrous +2), a smaller one -1 (p166) */
export function sizeRangedSl(
    attacker: BattleParticipant,
    target: BattleParticipant
): number {
    const a = canonStepOf(attacker);

    const t = canonStepOf(target);

    if (t < a) return -1;

    if (t === a) return 0;

    return canonSizeOfParticipant(target) === 'monstrous' ? 2 : 1;
}

/** Parrying a bigger attacker with a Melee skill costs 2 SL; Dodge is free (p360) */
export const parryVsBiggerSl = (
    defender: BattleParticipant,
    attacker: BattleParticipant
): number => (canonStepOf(attacker) > canonStepOf(defender) ? -2 : 0);

const OUTNUMBER_WEIGHT: Record<CanonSize, 1 | 2 | 3 | 4> = {
    small: 1,
    average: 1,
    large: 2,
    enormous: 3,
    monstrous: 4,
};

export const outnumberWeight = (p: BattleParticipant): 1 | 2 | 3 | 4 =>
    OUTNUMBER_WEIGHT[canonSizeOfParticipant(p)];

/** A bigger mover shrugs off engagement by smaller foes (p360) */
export const isBiggerThan = (
    a: BattleParticipant,
    b: BattleParticipant
): boolean => canonStepOf(a) > canonStepOf(b);

/** Opposed Strength: two or more steps wins outright, one step lets the smaller side win only on a Critical (p360) */
export function sizeOpposedStrength(
    a: BattleParticipant,
    b: BattleParticipant
): 'auto' | 'critOnly' | 'normal' {
    const gap = Math.abs(canonStepOf(a) - canonStepOf(b));

    return gap >= 2 ? 'auto' : gap === 1 ? 'critOnly' : 'normal';
}
