import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { CampaignRole, isDemoKind } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import type { IdName } from '@/types/common';

export async function listCopyTargets(
    userId: string,
    excludeCampaignId: string
): Promise<IdName[]> {
    const members = await prisma.campaignMember.findMany({
        where: { userId, role: CampaignRole.DM },
        select: { campaign: { select: { id: true, name: true, kind: true } } },
        orderBy: { joinedAt: 'asc' },
    });

    return members
        .map((m) => m.campaign)
        .filter((c) => c.id !== excludeCampaignId && !isDemoKind(c.kind))
        .map(({ id, name }) => ({ id, name }));
}

export async function resolveTargets(args: {
    userId: string;
    sourceCampaignId: string;
    targets: { campaignIds: string[] } | { all: true };
}): Promise<IdName[]> {
    const allowed = await listCopyTargets(args.userId, args.sourceCampaignId);

    if ('all' in args.targets) return allowed;

    const byId = new Map(allowed.map((c) => [c.id, c]));

    const ids = [...new Set(args.targets.campaignIds)];

    const resolved = ids.map((id) => byId.get(id));

    if (resolved.some((c) => !c))
        throw new ContentError(API_ERRORS.FORBIDDEN, 403);

    return resolved as IdName[];
}
