export const aiKeys = {
  credentials: () => ["ai-credentials"] as const,
  threads: (campaignId: string, pageId?: string) => ["ai-threads", campaignId, pageId ?? null] as const,
  messages: (campaignId: string, threadId: string) => ["ai-messages", campaignId, threadId] as const,
  proposals: (campaignId: string, pageId: string) => ["ai-proposals", campaignId, pageId] as const,
  settings: (campaignId: string) => ["ai-settings", campaignId] as const,
  apiTokens: (campaignId: string) => ["api-tokens", campaignId] as const,
};
