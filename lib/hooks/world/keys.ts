export const worldKeys = {
  maps: (campaignId: string) => ["world-maps", campaignId] as const,
  map: (campaignId: string, mapId: string) => ["world-map", campaignId, mapId] as const,
};
