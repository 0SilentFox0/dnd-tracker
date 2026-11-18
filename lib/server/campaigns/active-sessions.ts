import { CampaignKind, CampaignStatus } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import type { ActiveSessions } from '@/types/campaigns';

export async function listActiveSessions(userId: string, withShows: boolean) {
    const visibleCampaigns = {
        OR: [{ members: { some: { userId } } }, { kind: CampaignKind.DEMO }],
    };

    const [battles, shows] = await Promise.all([
        prisma.battleScene.findMany({
            where: {
                campaign: visibleCampaigns,
                status: CampaignStatus.ACTIVE,
            },
            select: { id: true, campaignId: true },
        }),
        withShows
            ? prisma.campaignShow.findMany({
                  where: {
                      deckId: { not: null },
                      campaign: visibleCampaigns,
                  },
                  select: { campaignId: true },
              })
            : null,
    ]);

    return shows ? ({ battles, shows } satisfies ActiveSessions) : battles;
}
