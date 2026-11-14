export const battleMapKeys = {
    all: (campaignId: string) => ['battle-maps', campaignId] as const,
    list: (campaignId: string) => ['battle-maps', campaignId, 'list'] as const,
    edges: (campaignId: string, mapId: string, version: number) =>
        ['battle-maps', campaignId, 'edges', mapId, version] as const,
};
