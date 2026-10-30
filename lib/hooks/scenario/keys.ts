export const scenarioKeys = {
  list: (campaignId: string) => ["scenario-pages", campaignId] as const,
  page: (campaignId: string, pageId: string) => ["scenario-page", campaignId, pageId] as const,
  versions: (campaignId: string, pageId: string) => ["scenario-versions", campaignId, pageId] as const,
  mentions: (campaignId: string, q: string) => ["scenario-mentions", campaignId, q] as const,
  search: (campaignId: string, q: string) => ["scenario-search", campaignId, q] as const,
  summaries: (campaignId: string) => ["scenario-summaries", campaignId] as const,
  index: (campaignId: string) => ["scenario-index", campaignId] as const,
};
