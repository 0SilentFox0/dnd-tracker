import type { DifficultyKey } from '../percentile/difficulty';

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

export const EXPOSURE_DEGREES = ['minor', 'moderate', 'major'] as const;

export type ExposureDegree = (typeof EXPOSURE_DEGREES)[number];

export const EXPOSURE_SKILLS = ['endurance', 'cool'] as const;

export type ExposureSkill = (typeof EXPOSURE_SKILLS)[number];

/** canon5e (p187-188): points on failure and on success by the lowest SL of each band, highest band first */
export const EXPOSURE_POINTS: Record<
    ExposureDegree,
    { failure: number; bySl: readonly { minSl: number; points: number }[] }
> = {
    minor: { failure: 1, bySl: [{ minSl: 0, points: 0 }] },
    moderate: {
        failure: 2,
        bySl: [
            { minSl: 1, points: 0 },
            { minSl: 0, points: 1 },
        ],
    },
    major: {
        failure: 3,
        bySl: [
            { minSl: 4, points: 0 },
            { minSl: 1, points: 1 },
            { minSl: 0, points: 2 },
        ],
    },
};
