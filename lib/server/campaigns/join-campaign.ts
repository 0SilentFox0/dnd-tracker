import { invalidateCampaignLists } from '@/lib/cache/campaign-list';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    CampaignKind,
    CampaignRole,
    CampaignStatus,
    isDemoKind,
} from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { ensureDbUser, PUBLIC_USER_SELECT } from '@/lib/server/users/db-user';
import type { AuthUserResult } from '@/lib/utils/api/api-auth';

type JoinFailure = {
    ok: false;
    error: (typeof API_ERRORS)[keyof typeof API_ERRORS];
    status: 400 | 403 | 404;
};

export async function joinCampaignByCode(
    userId: string,
    authUser: AuthUserResult['authUser'],
    inviteCode: string
) {
    // codes are uppercase, but phone keyboards often send lowercase
    const campaign = await prisma.campaign.findFirst({
        where: { inviteCode: { equals: inviteCode, mode: 'insensitive' } },
        include: { members: { select: { userId: true } } },
        omit: { aiInstructions: true },
    });

    const failure = (
        error: JoinFailure['error'],
        status: JoinFailure['status']
    ): JoinFailure => ({ ok: false, error, status });

    if (!campaign) return failure(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    if (campaign.kind === CampaignKind.TEMPLATE)
        return failure(API_ERRORS.TEMPLATE_NOT_JOINABLE, 403);

    if (isDemoKind(campaign.kind))
        return failure(API_ERRORS.DEMO_NOT_JOINABLE, 403);

    if (campaign.status !== CampaignStatus.ACTIVE)
        return failure(API_ERRORS.CAMPAIGN_NOT_ACTIVE, 400);

    if (campaign.members.some((m) => m.userId === userId))
        return failure(API_ERRORS.ALREADY_MEMBER, 400);

    await ensureDbUser(authUser);

    const member = await prisma.campaignMember.create({
        data: { campaignId: campaign.id, userId, role: CampaignRole.PLAYER },
        include: {
            campaign: { omit: { aiInstructions: true } },
            user: { select: PUBLIC_USER_SELECT },
        },
    });

    await invalidateCampaignLists([
        userId,
        ...campaign.members.map((m) => m.userId),
    ]);

    return { ok: true as const, member };
}
