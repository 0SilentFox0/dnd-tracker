import { campaignGet, campaignPost } from "@/lib/api/client";
import type { CharacterProgressionDto } from "@/types/progression";

const base = (characterId: string) => `/characters/${characterId}/progression`;

export const getCharacterProgression = (campaignId: string, characterId: string) => campaignGet<CharacterProgressionDto>(campaignId, base(characterId));

export const learnNode = (campaignId: string, characterId: string, nodeId: string) => campaignPost<{ unlocked: string[] }>(campaignId, `${base(characterId)}/learn`, { nodeId });

export const unlearnNode = (campaignId: string, characterId: string, nodeId: string) => campaignPost<{ unlocked: string[] }>(campaignId, `${base(characterId)}/unlearn`, { nodeId });

export const resetProgression = (campaignId: string, characterId: string) => campaignPost<{ unlocked: string[] }>(campaignId, `${base(characterId)}/reset`, {});

export const markLevelSeen = (campaignId: string, characterId: string) => campaignPost<{ seenLevel: number }>(campaignId, `${base(characterId)}/seen-level`, {});
