export const CharacterType = { PLAYER: "player", NPC_HERO: "npc_hero" } as const;

export type CharacterTypeValue = (typeof CharacterType)[keyof typeof CharacterType];

export const CONTROLLED_BY_DM = "dm";

export const GoalAuthor = { DM: "dm", PLAYER: "player" } as const;

export type GoalAuthorValue = (typeof GoalAuthor)[keyof typeof GoalAuthor];
