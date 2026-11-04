export const DIFFICULTY_KEYS = ["veryEasy", "easy", "average", "challenging", "difficult", "hard", "veryHard"] as const;

export type DifficultyKey = (typeof DIFFICULTY_KEYS)[number];

// модифікатори цілі 4e; звірити з книгою
export const DIFFICULTY_MODIFIER: Record<DifficultyKey, number> = { veryEasy: 60, easy: 40, average: 20, challenging: 0, difficult: -10, hard: -20, veryHard: -30 };
