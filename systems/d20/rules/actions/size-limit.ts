import { sizeOf } from '@/lib/utils/battle/grid/occupancy';
import type { BattleParticipant } from '@/types/battle';

/** Grapple and shove reach a target at most one size larger (footprint cells stand in for size). */
export const tooBigToHold = (
    actor: BattleParticipant,
    target: BattleParticipant
): boolean => sizeOf(target) > sizeOf(actor) + 1;
