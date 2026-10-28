export const campaignKeys = {
  members: (campaignId: string) => ["campaign-members", campaignId] as const,
  rules: (campaignId: string) => ["campaign-rules", campaignId] as const,
};
