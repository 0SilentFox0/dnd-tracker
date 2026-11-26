import type { Prisma } from '@prisma/client';

export async function deleteCampaignRows(
    tx: Prisma.TransactionClient,
    campaignId: string
): Promise<void> {
    await tx.campaignContentHide.deleteMany({ where: { campaignId } });
    await tx.campaign.delete({ where: { id: campaignId } });
}
