type MetalTier =
    | 'iron'
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'mithril'
    | 'platinum'
    | 'adamant'
    | 'orichalcum'
    | 'starmetal'
    | 'void';

export const metalClass = (tier: MetalTier) => `metal-${tier}`;

export const spellLevelMetal = (level: number) =>
    `circle-${Math.max(0, Math.min(9, level))}`;

export const BRANCH_LEVEL_METAL = {
    basic: 'metal-bronze',
    advanced: 'metal-silver',
    expert: 'metal-gold',
} as const;

export const CIRCLE_METAL = {
    outer: BRANCH_LEVEL_METAL.basic,
    middle: BRANCH_LEVEL_METAL.advanced,
    inner: BRANCH_LEVEL_METAL.expert,
} as const;
