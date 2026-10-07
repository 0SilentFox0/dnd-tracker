export const characterSheetKey = (campaignId: string, characterId?: string) => (characterId ? ["character-sheet", campaignId, characterId] : ["character-sheet", campaignId]);
