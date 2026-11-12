export const CharacterType = {
    PLAYER: 'player',
    NPC_HERO: 'npc_hero',
} as const;

export type CharacterTypeValue =
    (typeof CharacterType)[keyof typeof CharacterType];

export const CharacterStatus = {
    ACTIVE: 'active',
    PENDING: 'pending',
} as const;

export type CharacterStatusValue =
    (typeof CharacterStatus)[keyof typeof CharacterStatus];

export const ACTIVE_CHARACTER = { status: CharacterStatus.ACTIVE } as const;

export const CONTROLLED_BY_DM = 'dm';

export const HERO_INITIATIVE_BOUNDS = { MIN: 0, MAX: 50 } as const;

export const clampHeroInitiative = (
    n: number | null | undefined,
    range: { heroMin: number; heroMax: number }
) =>
    Math.min(
        range.heroMax,
        Math.max(range.heroMin, Math.round(n ?? range.heroMin))
    );

export const GoalAuthor = { DM: 'dm', PLAYER: 'player' } as const;

export type GoalAuthorValue = (typeof GoalAuthor)[keyof typeof GoalAuthor];

export const MAX_GOALS = 30;

export const GOAL_TEXT_MAX = 600;

export const NOTES_MAX = 5000;

export const GOAL_TITLE_MAX = 80;

export const GoalKind = {
    MAIN: 'main',
    PERSONAL: 'personal',
    INNER: 'inner',
    SECRET: 'secret',
} as const;

export type GoalKind = (typeof GoalKind)[keyof typeof GoalKind];

export const GoalStatus = {
    ACTIVE: 'active',
    DONE: 'done',
    FAILED: 'failed',
} as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const TOKEN_COLORS = ['red', 'green'] as const;

export const TOKEN_LABEL_MAX = 120;
