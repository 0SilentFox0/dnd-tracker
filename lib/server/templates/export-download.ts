import { prisma } from '@/lib/db';
import { exportCampaign } from '@/lib/server/templates/export-campaign';

export async function exportCampaignDownload(campaignId: string) {
    const bundle = await exportCampaign(prisma, campaignId);

    const date = new Date().toISOString().slice(0, 10);

    return { bundle, fileName: `campaign-${campaignId}-${date}.json` };
}
