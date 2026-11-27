import { CampaignRole } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';

export async function hasDmRole(userId: string): Promise<boolean> {
    const member = await prisma.campaignMember.findFirst({
        where: { userId, role: CampaignRole.DM },
        select: { id: true },
    });

    return member !== null;
}
