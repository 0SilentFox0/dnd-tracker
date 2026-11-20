import type { WeatherKind } from '@/types/battle-grid';

// All values: verify against 5e book.
export const OUTNUMBERING_BONUS = 10;

/** Engaged foes that make a character Surrounded: no Disengage (p163) */
export const SURROUNDED_FOES = 3;

export const MOMENTUM_SL_BONUS = 1;

/** SL penalty of an attack with the off hand (p167) */
export const OFFHAND_SL_PENALTY = 2;

/** Melee SL when the target is outnumbered or surrounded; they do not add up (p166) */
export const OUTNUMBERED_SL = 1;

export const SURROUNDED_SL = 2;

export const HIGH_GROUND_SL = 1;

/** Attacker in mud, water or difficult terrain (p166) */
export const TERRAIN_SL = -1;

/** Enclosed space with a weapon of Average / greater reach (p166) */
export const ENCLOSED_SL = -1;

export const ENCLOSED_LONG_SL = -2;

export const CALLED_SHOT_SL = -2;

/** Point Blank is 4 yards; the other bands are fractions of the weapon's Medium range (p302) */
export const POINT_BLANK_YARDS = 4;

export const FEET_PER_YARD = 3;

/** Ranged SL by range band (p166) */
export const RANGE_BAND_SL = {
    pointBlank: 2,
    short: 1,
    medium: 0,
    long: -1,
    extreme: -2,
} as const;

/** Target in cover or Prone (p166) */
export const COVER_SL = -1;

export const AIM_SL = 1;

/** The shooter moved before firing (p166) */
export const MOVED_SL = -1;

/** Ranged SL by map weather; only conditions the book names (p166: fog -1, rain -2), other kinds are 0 */
export const WEATHER_SL: Partial<Record<WeatherKind, number>> = {
    fog: -1,
    rain: -2,
};

export const MIN_DAMAGE = 1;

export const LOCATIONS = ['head', 'arm', 'body', 'leg'] as const;

export type HitLocation = (typeof LOCATIONS)[number];

export const SIDES = ['left', 'right'] as const;

export type HitSide = (typeof SIDES)[number];

/** Canon5e splits arms and legs into left and right (p164); AP and crit tables still key on the zone */
export const ACCEPTED_SPOTS = [
    ...LOCATIONS,
    'leftArm',
    'rightArm',
    'leftLeg',
    'rightLeg',
] as const;

export type HitSpot = (typeof ACCEPTED_SPOTS)[number];

/** The six spots of the canon5e table, in table order */
export const SPOTS = [
    'head',
    'leftArm',
    'rightArm',
    'body',
    'leftLeg',
    'rightLeg',
] as const;

export type DefenseKind = 'parry' | 'dodge' | 'shield';

export const BALANCE_REF_TB = 3;

export const BALANCE_REF_AP = 0;

export const BALANCE_REF_TARGET = 40;

export const BALANCE_REF_INCOMING = 8;
