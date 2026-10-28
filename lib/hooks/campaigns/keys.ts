export const campaignKeys = {
  members: (campaignId: string) => ["campaign-members", campaignId] as const,
  detail: (campaignId: string) => ["campaign", campaignId] as const,
  rules: (campaignId: string) => ["campaign-rules", campaignId] as const,
  templates: () => ["campaign-templates"] as const,
  sourceDiff: (campaignId: string) => ["campaign-source-diff", campaignId] as const,
};
