export const CharacterType = { PLAYER: "player", NPC_HERO: "npc_hero" } as const;

export type CharacterTypeValue = (typeof CharacterType)[keyof typeof CharacterType];
