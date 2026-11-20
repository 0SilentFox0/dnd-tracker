export const TRAIT_SIZES = [
    'tiny',
    'little',
    'small',
    'average',
    'large',
    'enormous',
    'monstrous',
] as const;

export type TraitSize = (typeof TRAIT_SIZES)[number];

export const PSYCHOLOGY_KINDS = ['fear', 'terror'] as const;

export type PsychologyKind = (typeof PSYCHOLOGY_KINDS)[number];

export const PASSION_KINDS = ['frenzy', 'hatred', 'animosity'] as const;

export type PassionKind = (typeof PASSION_KINDS)[number];

export const GROUP_PASSIONS: readonly PassionKind[] = ['hatred', 'animosity'];

export const PASSION_GROUP_MAX = 40;

export const TRAIT_ATTACKS = [
    'bite',
    'claw',
    'breath',
    'weapon',
    'ranged',
] as const;

export const WFRP_EFFECT_KINDS: readonly string[] = [
    'wfrpArmour',
    'wfrpWard',
    'wfrpSize',
    'wfrpPsychology',
    'wfrpPassion',
    'wfrpAttack',
];

export const isWfrpEffectKind = (kind: string): boolean =>
    WFRP_EFFECT_KINDS.includes(kind);
