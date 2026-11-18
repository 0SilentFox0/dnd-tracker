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

// 4e modifiers / 10; verify against 5e book
export const DIFFICULTY_SL: Record<DifficultyKey, number> = {
    veryEasy: 6,
    easy: 4,
    average: 2,
    challenging: 0,
    difficult: -1,
    hard: -2,
    veryHard: -3,
};
