export const backgroundKeys = {
  list: (campaignId: string) => ["backgrounds", campaignId] as const,
  detail: (campaignId: string, backgroundId: string) => ["backgrounds", campaignId, backgroundId] as const,
};
