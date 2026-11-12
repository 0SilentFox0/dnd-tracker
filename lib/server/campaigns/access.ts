/**
 * Access-check кампанії для server-pages: не залогінений → /sign-in, немає кампанії чи членства → /campaigns,
 * DM-only для гравця → /campaigns/[id]. Для API-routes — `requireCampaignAccess` / `requireDM` у `lib/utils/api/api-auth.ts`.
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Campaign, CampaignMember } from '@prisma/client';

import 'server-only';
import { getAuthUser } from '@/lib/auth';
import { CampaignRole, isDemoKind } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { PUBLIC_USER_SELECT } from '@/lib/server/users/db-user';
import type { PublicUser } from '@/types/campaigns';

// aiInstructions is DM-only and always omitted from page reads
type PublicCampaign = Omit<Campaign, 'aiInstructions'>;

type SlimMembership = {
    userId: string;
    role: string;
};

type FullMembership = CampaignMember & { user: PublicUser };

const campaignWithMembership = cache((campaignId: string, userId: string) =>
    prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { members: { where: { userId } } },
        omit: { aiInstructions: true },
    })
);

/** Shared within a server render so the layout and its page reuse the same access lookup. */
export function getCampaignForLayout(campaignId: string, userId: string) {
    return campaignWithMembership(campaignId, userId);
}

/**
 * Завантажує campaign + проста перевірка членства.
 * Повертає лише власну membership (для access-check, не для UI).
 *
 * Use case: DM dashboard pages, де показуєш список ресурсів кампанії,
 * не потрібен повний список members.
 */
export async function requireCampaignMember(campaignId: string): Promise<{
    campaign: PublicCampaign;
    userId: string;
    role: string;
    isDM: boolean;
    isDemo: boolean;
    authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
    const authUser = await getAuthUser();

    const userId = authUser.id;

    const campaign = await getCampaignForLayout(campaignId, userId);

    if (!campaign) redirect('/campaigns');

    if (isDemoKind(campaign.kind)) {
        return {
            campaign,
            userId,
            role: 'demo',
            isDM: false,
            isDemo: true,
            authUser,
        };
    }

    const member = campaign.members[0];

    if (!member) redirect('/campaigns');

    return {
        // members не повертаємо — це лише slim access-check map.
        // Споживачі, яким треба список members, кличуть requireCampaignWithMembers.
        campaign,
        userId,
        role: member.role,
        isDM: member.role === CampaignRole.DM,
        isDemo: false,
        authUser,
    };
}

/**
 * Те саме, що requireCampaignMember, але з додатковою DM-only перевіркою.
 * Не-DM → redirect(`/campaigns/${id}`).
 */
export async function requireCampaignDM(campaignId: string): Promise<{
    campaign: PublicCampaign;
    userId: string;
    authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
    const result = await requireCampaignMember(campaignId);

    if (!result.isDM) redirect(`/campaigns/${campaignId}`);

    return {
        campaign: result.campaign,
        userId: result.userId,
        authUser: result.authUser,
    };
}

/** Read-only content pages available to campaign DMs and authenticated Demo visitors. */
export async function requireCampaignDMOrDemo(campaignId: string): Promise<{
    campaign: PublicCampaign;
    userId: string;
    isDemo: boolean;
    authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
    const result = await requireCampaignMember(campaignId);

    if (!result.isDM && !result.isDemo) redirect(`/campaigns/${campaignId}`);

    return {
        campaign: result.campaign,
        userId: result.userId,
        isDemo: result.isDemo,
        authUser: result.authUser,
    };
}

/**
 * Завантажує campaign з усіма members + user-relation для UI рендеру.
 * Повертає role поточного користувача окремо.
 *
 * Use case: campaign detail page, де треба показати members list.
 */
export async function requireCampaignWithMembers(campaignId: string): Promise<{
    campaign: PublicCampaign & {
        members: FullMembership[];
        dm: PublicUser | null;
    };
    userId: string;
    role: string;
    isDM: boolean;
    isDemo: boolean;
    ownMembership: SlimMembership | null;
    authUser: Awaited<ReturnType<typeof getAuthUser>>;
}> {
    const authUser = await getAuthUser();

    const userId = authUser.id;

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            members: {
                include: { user: { select: PUBLIC_USER_SELECT } },
            },
            dm: { select: PUBLIC_USER_SELECT },
        },
        omit: { aiInstructions: true },
    });

    if (!campaign) redirect('/campaigns');

    if (isDemoKind(campaign.kind)) {
        return {
            campaign: { ...campaign, members: [] },
            userId,
            role: 'demo',
            isDM: false,
            isDemo: true,
            ownMembership: null,
            authUser,
        };
    }

    const member = campaign.members.find((m) => m.userId === userId);

    if (!member) redirect('/campaigns');

    return {
        campaign,
        userId,
        role: member.role,
        isDM: member.role === CampaignRole.DM,
        isDemo: false,
        ownMembership: { userId: member.userId, role: member.role },
        authUser,
    };
}
