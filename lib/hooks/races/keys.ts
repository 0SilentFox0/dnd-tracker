export const raceKeys = {
  list: (campaignId: string) => ["races", campaignId] as const,
};

export const raceProfileKeys = {
  list: (campaignId: string) => ["race-profiles", campaignId] as const,
};
