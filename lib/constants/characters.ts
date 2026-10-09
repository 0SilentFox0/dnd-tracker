export const CharacterType = { PLAYER: "player", NPC_HERO: "npc_hero" } as const;

export type CharacterTypeValue = (typeof CharacterType)[keyof typeof CharacterType];

export const CONTROLLED_BY_DM = "dm";

export const GoalAuthor = { DM: "dm", PLAYER: "player" } as const;

export type GoalAuthorValue = (typeof GoalAuthor)[keyof typeof GoalAuthor];

export const MAX_GOALS = 30;

export const GoalStatus = { ACTIVE: "active", DONE: "done", FAILED: "failed" } as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const TOKEN_COLORS = ["red", "green"] as const;

export const TOKEN_LABEL_MAX = 120;
