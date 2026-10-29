export const notificationKeys = {
  list: (campaignId: string) => ["notifications", campaignId] as const,
};
