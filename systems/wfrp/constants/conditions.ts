export const WFRP_CONDITION_MAX_LEVEL = 10;

export const WFRP_CONDITION_KEYS = [
    'bleeding',
    'fatigued',
    'poisoned',
    'stunned',
    'ablaze',
    'broken',
    'entangled',
    'prone',
    'surprised',
    'blinded',
    'deafened',
    'unconscious',
] as const;

export type WfrpConditionKey = (typeof WFRP_CONDITION_KEYS)[number];
