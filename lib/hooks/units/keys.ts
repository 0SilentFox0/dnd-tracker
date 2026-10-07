export const unitKeys = {
  list: (campaignId: string) => ["units", campaignId] as const,
  detail: (campaignId: string, unitId: string) => ["unit", campaignId, unitId] as const,
};
