export const scenarioKeys = {
  list: (campaignId: string) => ["scenario-pages", campaignId] as const,
  page: (campaignId: string, pageId: string) => ["scenario-page", campaignId, pageId] as const,
  versions: (campaignId: string, pageId: string) => ["scenario-versions", campaignId, pageId] as const,
  search: (campaignId: string, q: string) => ["scenario-search", campaignId, q] as const,
};
