import { moveOf, runYards } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';

const FEET_PER_YARD = 3;

export const yardsToFeet = (yards: number): number => yards * FEET_PER_YARD;

export type ChargeBand = 'far' | 'momentum' | 'near';

/** Charge (p163): beyond Run range it is impossible; from at least Move yards away the charger gains Momentum */
export function chargeBand(
    c: Characteristics,
    distanceYards: number
): ChargeBand {
    if (distanceYards > runYards(c)) return 'far';

    return distanceYards >= moveOf(c) ? 'momentum' : 'near';
}

/** Sprint (p163): Run yards plus the SL of the Athletics test, on top of the turn's Move */
export const sprintYards = (c: Characteristics, sl: number): number =>
    runYards(c) + Math.max(0, sl);
