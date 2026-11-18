import { CampaignKind } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import {
    CAMPAIGN_INCLUDE,
    CAMPAIGN_OMIT,
} from '@/lib/server/campaigns/create-campaign';
import { PUBLIC_USER_SELECT } from '@/lib/server/users/db-user';

export function listUserCampaigns(userId: string) {
    return prisma.campaign.findMany({
        where: {
            kind: CampaignKind.CAMPAIGN,
            members: { some: { userId } },
        },
        include: {
            members: { include: { user: { select: PUBLIC_USER_SELECT } } },
        },
        omit: CAMPAIGN_OMIT,
        orderBy: { updatedAt: 'desc' },
    });
}

export function readCampaign(id: string, isDM: boolean) {
    return prisma.campaign.findUnique({
        where: { id },
        include: CAMPAIGN_INCLUDE,
        omit: isDM ? CAMPAIGN_OMIT : { ...CAMPAIGN_OMIT, inviteCode: true },
    });
}
