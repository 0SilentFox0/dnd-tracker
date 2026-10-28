export const CharacterType = { PLAYER: "player", NPC_HERO: "npc_hero" } as const;

export type CharacterTypeValue = (typeof CharacterType)[keyof typeof CharacterType];

export const CONTROLLED_BY_DM = "dm";

// Як у HoMM5: стала величина без кидка, задає порядок ходу; юніти мають 5–19
export const HERO_INITIATIVE = { MIN: 10, MAX: 16, DEFAULT: 10 } as const;

export const clampHeroInitiative = (n: number | null | undefined) =>
  Math.min(HERO_INITIATIVE.MAX, Math.max(HERO_INITIATIVE.MIN, Math.round(n ?? HERO_INITIATIVE.DEFAULT)));

export const GoalAuthor = { DM: "dm", PLAYER: "player" } as const;

export type GoalAuthorValue = (typeof GoalAuthor)[keyof typeof GoalAuthor];

export const MAX_GOALS = 30;

export const GOAL_TEXT_MAX = 600;

export const GOAL_TITLE_MAX = 80;

export const GoalKind = { MAIN: "main", PERSONAL: "personal", INNER: "inner", SECRET: "secret" } as const;

export type GoalKind = (typeof GoalKind)[keyof typeof GoalKind];

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  [GoalKind.MAIN]: "Головна мета",
  [GoalKind.PERSONAL]: "Особиста мета",
  [GoalKind.INNER]: "Внутрішній конфлікт",
  [GoalKind.SECRET]: "Таємна мета",
};

export const GoalStatus = { ACTIVE: "active", DONE: "done", FAILED: "failed" } as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const TOKEN_COLORS = ["red", "green"] as const;

export const TOKEN_LABEL_MAX = 120;
