import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';

/** Legacy size model: percentage per step and damage multiplier */
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

export const SWARM_ENGAGED_WOUNDS = 1;

export const SWARM_RANGED_SL = 4;

export const FLIER_SHOOTER_SL = -2;

/** d10 results of Regeneration at 0 Wounds (regain 1) and for a Critical Wound (heal one) */
export const REGEN_REVIVE_FROM = 8;

export const REGEN_CRIT_ROLL = 10;

export const BREATH_BASE_YD = 20;

export const FEET_PER_YARD = 3;

/** Breath damage: a bonus added to Strength or Toughness Bonus (p358) */
export const BREATH_DAMAGE = {
    acid: { stat: 'tb', add: 4 },
    cold: { stat: 'sb', add: 2 },
    electricity: { stat: 'sb', add: 2 },
    fire: { stat: 'sb', add: 3 },
    poison: { stat: 'tb', add: 2 },
    smoke: { stat: 'sb', add: 0, none: true },
} as const;

/** Condition a breath hit adds */
export const BREATH_CONDITION = {
    cold: 'fatigued',
    electricity: 'stunned',
    fire: 'ablaze',
    poison: 'poisoned',
} as const;

/** Breath without a Ballistic Skill is rolled against this (p358) */
export const BREATH_DEFAULT_BS = 30;

/** Armour kinds that count as metal for Electricity breath */
export const METAL_ARMOUR_KINDS: readonly string[] = ['mail', 'plate'];
