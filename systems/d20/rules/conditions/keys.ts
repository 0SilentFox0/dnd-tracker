export const CONDITION_5E_KEYS = [
    'blinded',
    'charmed',
    'deafened',
    'frightened',
    'grappled',
    'incapacitated',
    'invisible',
    'paralyzed',
    'petrified',
    'poisoned',
    'prone',
    'restrained',
    'stunned',
    'unconscious',
    'exhaustion',
] as const;

export type Condition5eKey = (typeof CONDITION_5E_KEYS)[number];

export const isCondition5eKey = (key: unknown): key is Condition5eKey =>
    (CONDITION_5E_KEYS as readonly unknown[]).includes(key);
