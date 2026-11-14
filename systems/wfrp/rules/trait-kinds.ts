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
    'wfrpAttack',
];

export const isWfrpEffectKind = (kind: string): boolean =>
    WFRP_EFFECT_KINDS.includes(kind);
