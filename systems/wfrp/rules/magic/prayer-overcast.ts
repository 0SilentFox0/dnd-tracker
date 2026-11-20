import {
    BLESSING_OVERCAST,
    type BlessingDimension,
    OVERCAST_SL_STEP,
} from './constants';

import type { SpellMagicKind } from '@/lib/utils/spells/model/schema';

export interface PrayerOvercast {
    steps: number;
    /** Blessing: the bonus per dimension; Miracle: only `steps` (each step is another initial value) */
    bonus: Partial<Record<BlessingDimension, number>>;
}

export const prayerSteps = (sl: number): number =>
    Math.max(0, Math.floor(sl / OVERCAST_SL_STEP));

/** `pick` defaults to the first dimension (range) until the UI offers a choice */
export function prayerOvercast(
    kind: SpellMagicKind | undefined,
    steps: number,
    pick: BlessingDimension = BLESSING_OVERCAST[0].dimension
): PrayerOvercast {
    if (kind !== 'blessing' || steps <= 0) return { steps, bonus: {} };

    const row = BLESSING_OVERCAST.find((r) => r.dimension === pick);

    return { steps, bonus: row ? { [pick]: steps * row.per } : {} };
}
