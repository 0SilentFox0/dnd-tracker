import 'server-only';
import {
    CampaignKind,
    CampaignStatus,
} from '@/lib/constants/campaigns';
import { CharacterStatus, CharacterType } from '@/lib/constants/characters';
import { prisma } from '@/lib/db';

export interface ProfileCampaign {
    id: string;
    name: string;
    role: string;
    updatedAt: string;
}

export interface ProfileCharacter {
    id: string;
    name: string;
    level: number;
    className: string;
    avatar: string | null;
    campaignId: string;
    campaignName: string;
}

export interface ProfileSummary {
    campaigns: number;
    characters: number;
    lastActivity: string | null;
    recentCampaigns: ProfileCampaign[];
    recentCharacters: ProfileCharacter[];
}

const RECENT_CAMPAIGNS = 5;

const RECENT_CHARACTERS = 6;

const LIVE_CAMPAIGN = {
    status: CampaignStatus.ACTIVE,
    kind: CampaignKind.CAMPAIGN,
};

export async function getProfileSummary(
    userId: string
): Promise<ProfileSummary> {
    const [campaigns, characters, activity, recent, heroes] = await Promise.all([
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
        prisma.campaignMember.findMany({
            where: { userId, campaign: LIVE_CAMPAIGN },
            orderBy: { campaign: { updatedAt: 'desc' } },
            take: RECENT_CAMPAIGNS,
            select: {
                role: true,
                campaign: { select: { id: true, name: true, updatedAt: true } },
            },
        }),
        prisma.character.findMany({
            where: {
                controlledBy: userId,
                type: CharacterType.PLAYER,
                status: CharacterStatus.ACTIVE,
                campaign: LIVE_CAMPAIGN,
            },
            orderBy: { updatedAt: 'desc' },
            take: RECENT_CHARACTERS,
            select: {
                id: true,
                name: true,
                level: true,
                class: true,
                avatar: true,
                campaignId: true,
                campaign: { select: { name: true } },
            },
        }),
    ]);

    return {
        campaigns,
        characters,
        lastActivity: activity._max.updatedAt?.toISOString() ?? null,
        recentCampaigns: recent.map((m) => ({
            id: m.campaign.id,
            name: m.campaign.name,
            role: m.role,
            updatedAt: m.campaign.updatedAt.toISOString(),
        })),
        recentCharacters: heroes.map((c) => ({
            id: c.id,
            name: c.name,
            level: c.level,
            className: c.class,
            avatar: c.avatar,
            campaignId: c.campaignId,
            campaignName: c.campaign.name,
        })),
    };
}
