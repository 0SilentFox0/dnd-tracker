export const battleMapKeys = {
    all: (campaignId: string) => ['battle-maps', campaignId] as const,
    list: (campaignId: string) => ['battle-maps', campaignId, 'list'] as const,
    edges: (campaignId: string, ref?: { mapId: string; version: number }) =>
        ref
            ? ([
                  'battle-maps',
                  campaignId,
                  'edges',
                  ref.mapId,
                  ref.version,
              ] as const)
            : (['battle-maps', campaignId, 'edges'] as const),
};
