import type { TraitSize } from "@/lib/utils/abilities/schema/kinds";

// All values: verify against 5e book.
export const SIZE_HIT_PER_STEP = 10;

export const SIZE_DAMAGE_PER_STEP = 1;

export const AVERAGE_SIZE: TraitSize = "average";

export const BREATH_BLAST = 2;

export const BREATH_DEFAULT_RANGE_FT = 36;

export const RANGED_DEFAULT_RANGE_FT = 72;

export const TRAIT_MELEE_CELLS = 1;

export const REGENERATE_DICE = "1d10";

export const NIGHT_VISION_FT = 60;

export const PSYCHOLOGY_PASS_SL = (value: number) => value - 1;
