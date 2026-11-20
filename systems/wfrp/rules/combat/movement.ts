import { moveOf } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';
import { burdenedMove, type BurdenTier } from '../equipment/encumbrance';

const FEET_PER_YARD = 3;

export const yardsToFeet = (yards: number): number => yards * FEET_PER_YARD;

export type ChargeBand = 'far' | 'momentum' | 'near';

/** Charge (p163): beyond Run range it is impossible; from at least Move yards away the charger gains Momentum */
export function chargeBand(
    c: Characteristics,
    distanceYards: number,
    tier: BurdenTier = 0
): ChargeBand {
    const move = burdenedMove(moveOf(c), tier);

    if (distanceYards > move * 4) return 'far';

    return distanceYards >= move ? 'momentum' : 'near';
}

/** Sprint (p163): Run yards plus the SL of the Athletics test, on top of the turn's Move */
export const sprintYards = (
    c: Characteristics,
    sl: number,
    tier: BurdenTier = 0
): number => burdenedMove(moveOf(c), tier) * 4 + Math.max(0, sl);
