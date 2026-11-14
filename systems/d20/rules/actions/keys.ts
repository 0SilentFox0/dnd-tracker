export const CORE_ACTION_KEYS = [
    'dash',
    'disengage',
    'dodge',
    'help',
    'hide',
    'ready',
    'standUp',
    'grapple',
    'shove',
    'escape',
] as const;

export type CoreActionKey = (typeof CORE_ACTION_KEYS)[number];
