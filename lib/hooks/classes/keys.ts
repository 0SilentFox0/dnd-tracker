export const classKeys = {
  list: (campaignId: string) => ["classes", campaignId] as const,
  detail: (campaignId: string, classId: string) => ["classes", campaignId, classId] as const,
};
