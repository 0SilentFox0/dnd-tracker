export const contentCopyKeys = {
    options: (campaignId: string, kind: string) =>
        ['content-copy-options', campaignId, kind] as const,
    campaigns: (campaignId: string) =>
        ['content-copy-campaigns', campaignId] as const,
};

export const touchesCampaign = (campaignIds: readonly string[]) => ({
    queryKey,
}: {
    queryKey: readonly unknown[];
}) => queryKey.some((part) => campaignIds.includes(part as string));
