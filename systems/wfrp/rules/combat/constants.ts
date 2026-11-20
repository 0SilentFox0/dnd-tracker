// All values: verify against 5e book.
export const OUTNUMBERING_BONUS = 10;

/** Engaged foes that make a character Surrounded: no Disengage (p163) */
export const SURROUNDED_FOES = 3;

export const MOMENTUM_SL_BONUS = 1;

/** SL penalty of an attack with the off hand (p167) */
export const OFFHAND_SL_PENALTY = 2;

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
