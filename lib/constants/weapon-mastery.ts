export const WEAPON_MASTERIES = [
    'cleave',
    'graze',
    'nick',
    'push',
    'sap',
    'slow',
    'topple',
    'vex',
] as const;

export type WeaponMastery = (typeof WEAPON_MASTERIES)[number];

export const WEAPON_MASTERY_RE = new RegExp(
    `\\bMastery:\\s*(${WEAPON_MASTERIES.join('|')})\\b`,
    'i'
);

export const WEAPON_MASTERY_PARAM_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;
