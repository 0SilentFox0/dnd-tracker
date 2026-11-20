export const WFRP_RESOURCE_ICON_KEYS = [
    'advantage',
    'momentum',
    'fate',
    'fortune',
    'resilience',
    'resolve',
    'corruption',
    'sin',
] as const;

export const WFRP_HIT_LOCATION_KEYS = [
    'head',
    'left-arm',
    'right-arm',
    'body',
    'left-leg',
    'right-leg',
] as const;

export const WFRP_TEST_OUTCOME_KEYS = [
    'critical-success',
    'critical-failure',
    'fumble',
    'wrath',
    'miscast',
] as const;

export const WFRP_HERO_ICON_KEYS = [
    'status-brass',
    'status-silver',
    'status-gold',
    'endeavour',
    'career-tick',
] as const;

export type WfrpResourceIconKey = (typeof WFRP_RESOURCE_ICON_KEYS)[number];
export type WfrpHitLocationKey = (typeof WFRP_HIT_LOCATION_KEYS)[number];
export type WfrpTestOutcomeKey = (typeof WFRP_TEST_OUTCOME_KEYS)[number];
export type WfrpHeroIconKey = (typeof WFRP_HERO_ICON_KEYS)[number];
