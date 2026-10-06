export const progressionCampaignKey = (campaignId: string) => ["character-progression", campaignId] as const;

export const progressionKey = (campaignId: string, characterId: string) => [...progressionCampaignKey(campaignId), characterId] as const;
