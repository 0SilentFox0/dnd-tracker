import type { SpellMagicKind } from '@/lib/utils/spells/model/schema';

// verify against 5e book
export const CAST_SKILL = { key: 'language', spec: 'magick' } as const;
// verify against 5e book
export const OVERCAST_SL_STEP = 2;
// verify against 5e book
export const ARMOUR_SL_PER_AP = 1;
// legacy only; canon5e has no cap (p236)
export const CHANNEL_MAX_SL = 10;

/** canon5e channelling (p236): a mishap drains 1d10 SL and shifts the miscast roll by this per SL lost */
export const CHANNEL_LOSS_DIE = 10;
export const CHANNEL_MISCAST_STEP = 10;
// verify against 5e book
export const NO_OVERCAST_KINDS: ReadonlySet<SpellMagicKind> = new Set([
    'petty',
    'blessing',
    'miracle',
]);
// verify against 5e book
export const PRAY_SKILL = { key: 'pray' } as const;
// verify against 5e book
export const PRAYER_KINDS: ReadonlySet<SpellMagicKind> = new Set([
    'blessing',
    'miracle',
]);
// verify against 5e book
export const MAX_OVERCAST_STEPS = 3;
// verify against 5e book
export const MAJOR_MISCAST_ROLLS: ReadonlySet<number> = new Set([99, 100]);
// verify against 5e book
export const WORST_ROLL = 100;

export const CRIT_BONUS_DEFAULT = 'totalPower' as const;

export const SIN_WRATH_STEP = 10;

/** canon5e prayer overcast (p217-222): every OVERCAST_SL_STEP SL grants one bonus; a Blessing picks one dimension, the default is the first */
export const BLESSING_OVERCAST = [
    { dimension: 'rangeYards', per: 6 },
    { dimension: 'targets', per: 1 },
    { dimension: 'durationRounds', per: 6 },
] as const;

export type BlessingDimension = (typeof BLESSING_OVERCAST)[number]['dimension'];

/** canon5e dispelling (p237) */
export const DISPEL_PERSISTENT_SL_OWN = 1;
