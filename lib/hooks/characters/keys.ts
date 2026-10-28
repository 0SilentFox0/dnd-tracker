import { battleKeys } from "@/lib/hooks/battles/keys";

export const characterKeys = {
  lists: (campaignId: string) => ["characters", campaignId] as const,
  list: (campaignId: string, type: string, compact: boolean) => ["characters", campaignId, type, compact ? "compact" : "full"] as const,
  detail: (campaignId: string, characterId: string) => ["character", campaignId, characterId] as const,
  details: (campaignId: string) => ["character", campaignId] as const,
  roster: (campaignId: string) => ["character-roster", campaignId] as const,
  sheet: (campaignId: string, characterId?: string) => (characterId ? (["character-sheet", campaignId, characterId] as const) : (["character-sheet", campaignId] as const)),
};

/** Keys every character create/update/delete affects: lists, the hero roster and the party power in battle balance. */
export const characterWriteKeys = (campaignId: string) => [
  characterKeys.lists(campaignId),
  characterKeys.roster(campaignId),
  battleKeys.balance(campaignId),
];
