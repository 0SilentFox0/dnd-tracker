import type { DifficultyKey } from '../percentile/difficulty';

// all values: verify against 5e book
export const GRANT_MAX = 10;
export const POINTS_MAX = 999;
export const MUTATIONS_MAX = 20;
export const PHYSICAL_MAX_ROLL = 50;
export const CORRUPTION_TEST_SKILL = 'endurance';
export const CORRUPTION_TEST_DIFFICULTY: DifficultyKey = 'challenging';
export const REASON_MAX = 80;

/** canon5e (p188): the Body/Mind split by species; the Body band is 01..N */
export const CANON_BODY_MAX_ROLL = {
    elf: 0,
    halfling: 10,
    human: 50,
    dwarf: 5,
} as const;

export type CorruptionSpecies = keyof typeof CANON_BODY_MAX_ROLL;
