import { FX_BADGE_VALUES,type FxBadgeKey } from '@/lib/utils/battle/fx/badges';

export type FxBadgeLabels = Record<FxBadgeKey, string>;

/** Used where no translated labels are passed (dev tools). */
export const DEFAULT_BADGE_LABELS: FxBadgeLabels = {
    thorns: `-${FX_BADGE_VALUES.thorns} attack`,
    rust: `-${FX_BADGE_VALUES.rust} AC`,
    raincloud: `-${FX_BADGE_VALUES.raincloud}`,
    might: '+attack',
    siphon: `-${FX_BADGE_VALUES.siphon}% damage`,
    stoneskin: '+AC',
};
