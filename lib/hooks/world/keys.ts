export const worldKeys = {
  maps: (campaignId: string) => ["world-maps", campaignId] as const,
  map: (campaignId: string, mapId: string) => ["world-map", campaignId, mapId] as const,
  view: (campaignId: string, mapId: string, asHeroId?: string) => ["world-view", campaignId, mapId, asHeroId ?? null] as const,
  log: (campaignId: string) => ["world-log", campaignId] as const,
};
