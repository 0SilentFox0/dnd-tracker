export const featKeys = {
  list: (campaignId: string) => ["feats", campaignId] as const,
  detail: (campaignId: string, featId: string) => ["feats", campaignId, featId] as const,
};
