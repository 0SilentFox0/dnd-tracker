// All values: verify against 5e book.
export const OUTNUMBERING_BONUS = 10;

export const MOMENTUM_SL_BONUS = 1;

export const MIN_DAMAGE = 1;

export const LOCATIONS = ["head", "arm", "body", "leg"] as const;

export type HitLocation = (typeof LOCATIONS)[number];

export type DefenseKind = "parry" | "dodge" | "shield";
