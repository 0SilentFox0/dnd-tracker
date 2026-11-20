import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';

// All values: verify against 5e book.
export const SIZE_HIT_PER_STEP = 10;

export const SIZE_DAMAGE_PER_STEP = 1;

export const AVERAGE_SIZE: TraitSize = 'average';

export const BREATH_BLAST = 2;

export const BREATH_DEFAULT_RANGE_FT = 36;

export const RANGED_DEFAULT_RANGE_FT = 72;

export const TRAIT_MELEE_CELLS = 1;

export const REGENERATE_DICE = '1d10';

export const NIGHT_VISION_FT = 60;

export const PSYCHOLOGY_PASS_SL = (value: number) => value - 1;

/** SL to defend with Melee against a larger creature (p360) */
export const SIZE_PARRY_SL = -2;

/** Ranged attack SL when the target is larger (Monstrous) or smaller than the shooter (p166) */
export const SIZE_RANGED_SL = { larger: 1, monstrous: 2, smaller: -1 } as const;

/** Creatures a size counts as when its side is checked for being outnumbered (p360) */
export const SIZE_OUTNUMBER_WEIGHT: Partial<Record<TraitSize, number>> = {
    large: 2,
    enormous: 3,
    monstrous: 4,
};

/** Extra damage as multiples of SB (p360) */
export const SIZE_DAMAGE_SB: Partial<Record<TraitSize, number>> = {
    large: 1,
    enormous: 1,
    monstrous: 2,
};
