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
import { normalizeInviteCode } from '@/lib/utils/campaigns/invite-link';

export type JoinFailure = {
    kind: 'error';
    ok: false;
    error: (typeof API_ERRORS)[keyof typeof API_ERRORS];
    status: 400 | 403 | 404;
};

const failure = (
    error: JoinFailure['error'],
    status: JoinFailure['status']
): JoinFailure => ({ kind: 'error', ok: false, error, status });

type JoinTarget = {
    kind: string;
    status: string;
    members: Array<{ userId: string }>;
};

export function checkJoinable(
    campaign: JoinTarget | null,
    userId: string
): JoinFailure | null {
    if (!campaign) return failure(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    if (campaign.kind === CampaignKind.TEMPLATE)
        return failure(API_ERRORS.TEMPLATE_NOT_JOINABLE, 403);

    if (isDemoKind(campaign.kind))
        return failure(API_ERRORS.DEMO_NOT_JOINABLE, 403);

    if (campaign.status !== CampaignStatus.ACTIVE)
        return failure(API_ERRORS.CAMPAIGN_NOT_ACTIVE, 400);

    if (campaign.members.some((m) => m.userId === userId))
        return failure(API_ERRORS.ALREADY_MEMBER, 400);

    return null;
}

export type JoinPreview =
    | { kind: 'member'; campaignId: string }
    | {
          kind: 'joinable';
          campaign: { id: string; name: string; dmName: string };
      }
    | JoinFailure;

export async function getJoinPreview(
    userId: string,
    inviteCode: string
): Promise<JoinPreview> {
    const campaign = await prisma.campaign.findUnique({
        where: { inviteCode: normalizeInviteCode(inviteCode) },
        select: {
            id: true,
            name: true,
            kind: true,
            status: true,
            dmUserId: true,
            members: {
                select: {
                    userId: true,
                    role: true,
                    user: { select: { displayName: true } },
                },
            },
        },
    });

    if (campaign?.members.some((m) => m.userId === userId))
        return { kind: 'member', campaignId: campaign.id };

    const rejected = checkJoinable(campaign, userId);

    if (rejected || !campaign)
        return rejected ?? failure(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    const dm =
        campaign.members.find((m) => m.userId === campaign.dmUserId) ??
        campaign.members.find((m) => m.role === CampaignRole.DM);

    return {
        kind: 'joinable',
        campaign: {
            id: campaign.id,
            name: campaign.name,
            dmName: dm?.user.displayName ?? '',
        },
    };
}

export async function joinCampaignByCode(
    userId: string,
    authUser: AuthUserResult['authUser'],
    inviteCode: string
) {
    const campaign = await prisma.campaign.findUnique({
        where: { inviteCode: normalizeInviteCode(inviteCode) },
        include: { members: { select: { userId: true } } },
        omit: { aiInstructions: true },
    });

    const rejected = checkJoinable(campaign, userId);

    if (rejected || !campaign)
        return rejected ?? failure(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    await ensureDbUser(authUser);

    const member = await prisma.campaignMember.create({
        data: { campaignId: campaign.id, userId, role: CampaignRole.PLAYER },
        include: {
            campaign: { select: { id: true, name: true } },
            user: { select: PUBLIC_USER_SELECT },
        },
    });

    await invalidateCampaignLists([
        userId,
        ...campaign.members.map((m) => m.userId),
    ]);

    return { ok: true as const, member };
}
