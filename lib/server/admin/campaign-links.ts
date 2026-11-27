import type { Prisma } from '@prisma/client';

export const cloneWhere = (
    templateIds: string[]
): Prisma.CampaignWhereInput => ({
    OR: [
        { createdFromId: { in: templateIds } },
        { baseSourceId: { in: templateIds } },
        { sourceSync: { is: { sourceCampaignId: { in: templateIds } } } },
    ],
});

export const systemKey = (rules: unknown): string | null => {
    const key = (rules as { system?: { key?: unknown } } | null)?.system?.key;

    return typeof key === 'string' ? key : null;
};
