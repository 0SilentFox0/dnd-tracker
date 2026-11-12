export const DIFFICULTY_KEYS = [
    'veryEasy',
    'easy',
    'average',
    'challenging',
    'difficult',
    'hard',
    'veryHard',
] as const;

export type DifficultyKey = (typeof DIFFICULTY_KEYS)[number];

// 4e-модифікатори/10; звірити з книгою 5e
export const DIFFICULTY_SL: Record<DifficultyKey, number> = {
    veryEasy: 6,
    easy: 4,
    average: 2,
    challenging: 0,
    difficult: -1,
    hard: -2,
    veryHard: -3,
};
