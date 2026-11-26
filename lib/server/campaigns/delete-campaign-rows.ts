import type { Prisma } from '@prisma/client';

import { layeredModels } from '@/lib/db/layer/config';
import { BUNDLE_TABLES } from '@/lib/server/templates/bundle';
import { unsafeCast } from '@/lib/utils/common/cast';

export async function deleteCampaignRows(
    tx: Prisma.TransactionClient,
    campaignId: string
): Promise<void> {
    await tx.campaignContentHide.deleteMany({ where: { campaignId } });
    await tx.campaign.delete({ where: { id: campaignId } });
}

/** Published base rows are keyed by sourceCampaignId without an FK, so they outlive the template. */
export async function deleteTemplateBaseRows(
    tx: Prisma.TransactionClient,
    templateIds: string[]
): Promise<void> {
    if (!templateIds.length) return;

    for (const t of BUNDLE_TABLES) {
        const delegate = unsafeCast<
            Record<
                string,
                {
                    deleteMany(args: {
                        where: { sourceCampaignId: { in: string[] } };
                    }): Promise<unknown>;
                }
            >
        >(tx)[layeredModels()[t.model].base];

        await delegate.deleteMany({
            where: { sourceCampaignId: { in: templateIds } },
        });
    }
}
