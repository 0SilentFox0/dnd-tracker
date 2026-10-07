export const characterKeys = {
  lists: (campaignId: string) => ["characters", campaignId] as const,
  list: (campaignId: string, type: string, compact: boolean) => ["characters", campaignId, type, compact ? "compact" : "full"] as const,
  detail: (campaignId: string, characterId: string) => ["character", campaignId, characterId] as const,
  details: (campaignId: string) => ["character", campaignId] as const,
  sheet: (campaignId: string, characterId?: string) => (characterId ? (["character-sheet", campaignId, characterId] as const) : (["character-sheet", campaignId] as const)),
};

export const characterSheetKey = characterKeys.sheet;
