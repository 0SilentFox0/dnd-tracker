export const worldKeys = {
    maps: (campaignId: string) => ['world-maps', campaignId] as const,
    mapAll: (campaignId: string) => ['world-map', campaignId] as const,
    map: (campaignId: string, mapId: string) =>
        ['world-map', campaignId, mapId] as const,
    viewAll: (campaignId: string) => ['world-view', campaignId] as const,
    view: (campaignId: string, mapId: string, asHeroId?: string) =>
        ['world-view', campaignId, mapId, asHeroId ?? null] as const,
    partyView: (campaignId: string, mapId: string) =>
        ['world-view', campaignId, mapId, 'party'] as const,
    log: (campaignId: string) => ['world-log', campaignId] as const,
    sessions: (campaignId: string) => ['world-sessions', campaignId] as const,
    trailAll: (campaignId: string) => ['world-trail', campaignId] as const,
    trail: (campaignId: string, mapId: string) =>
        ['world-trail', campaignId, mapId] as const,
};
