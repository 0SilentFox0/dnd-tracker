export const contentCopyKeys = {
    options: (campaignId: string, kind: string) =>
        ['content-copy-options', campaignId, kind] as const,
};
