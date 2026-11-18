export const TARGET_ROUNDS = 3.5;

/** 0.75 since the damageDice "+N" is applied (`pnpm balance-library`, no level correction: L3 87 / L6 88 / L10 90 % wins). */
export const HERO_EDGE = 0.75;

/** Enemy target correction above L6 (the hero power formula misses high-level abilities/ultimates): 0 to L6, linear to x1 at L10, x2 cap from L14. */
export const HIGH_LEVEL_FROM = 6;

export const HIGH_LEVEL_SPAN = 4;

export const HIGH_LEVEL_MAX_STEPS = 2;

export const HIGH_LEVEL_DPR_BOOST = 0.06;

export const HIGH_LEVEL_HP_BOOST = 0.06;

export const HIT_RATE = 0.55;

export const SCALE_MIN = 0.5;

export const SCALE_MAX = 3;

export const BALANCE_TOLERANCE = 0.1;

export const PICK_TOLERANCE = 0.25;

export const PICK_MAX_DISTINCT_UNITS = 3;

export const PICK_CANDIDATE_UNITS = 8;

export const HINT_MAX_STEPS = 6;

export const MAX_UNIT_QUANTITY = 20;

export const TYPICAL_TARGETS = 2;

export const MIN_UNIT_STAT = 1;

export const MAX_PICK_TOTAL = 14;

export const MAX_BALANCE_ALLIES = 50;

/** Median hero hit chance vs tier 1/4/7 AC (13/14/16) for the `balance-library` parties L3/6/10. */
export const REF_HERO_HIT = 0.8;

/** Median unit attack of tiers 1/4/7 (+6/+8/+9) vs the AC of those parties (12-17). */
export const REF_UNIT_HIT = 0.67;

export const ARMOR_FACTOR_MIN = 0.5;

export const ARMOR_FACTOR_MAX = 2;

/** A unit immune to magic is truly ~3x tougher against a caster party (~2/3 of damage is spells). */
export const DEFENSE_FACTOR_MAX = 3;

export const LIVE_SCALE_STEP = 1.1;

export const UNIT_SPELL_SLOTS = 3;

export const FALLBACK_SAVE_SUCCESS = 0.55;

/** Lower quartile, not the minimum: one weak unit must not block the tier. */
export const TIER_CEILING_QUANTILE = 0.25;
