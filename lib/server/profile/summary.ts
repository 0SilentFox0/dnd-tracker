import 'server-only';
import {
    CampaignKind,
    CampaignStatus,
} from '@/lib/constants/campaigns';
import { CharacterStatus, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';

export interface ProfileSummary {
    campaigns: number;
    characters: number;
    lastActivity: string | null;
}

const LIVE_CAMPAIGN = {
    status: CampaignStatus.ACTIVE,
    kind: CampaignKind.CAMPAIGN,
};

export async function getProfileSummary(
    userId: string
): Promise<ProfileSummary> {
    const [campaigns, characters, activity] = await Promise.all([
        prisma.campaignMember.count({
            where: { userId, campaign: LIVE_CAMPAIGN },
        }),
        prisma.character.count({
            where: {
                controlledBy: userId,
                type: CharacterType.PLAYER,
                status: CharacterStatus.ACTIVE,
                campaign: LIVE_CAMPAIGN,
            },
        }),
        prisma.campaign.aggregate({
            where: { members: { some: { userId } }, ...LIVE_CAMPAIGN },
            _max: { updatedAt: true },
        }),
    ]);

    return {
        campaigns,
        characters,
        lastActivity: activity._max.updatedAt?.toISOString() ?? null,
    };
}
