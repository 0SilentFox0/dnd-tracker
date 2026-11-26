import { invalidateCampaignLists } from '@/lib/cache/campaign-list';
import { prisma } from '@/lib/db';
import {
    planUserStorage,
    removeStoragePlan,
    type StoragePlan,
} from '@/lib/server/account/storage-cleanup';
import {
    AccountDeleteBlockedError,
    findBlockingTemplates,
} from '@/lib/server/account/template-guard';
import { deleteCampaignRows } from '@/lib/server/campaigns/delete-campaign-rows';
import { createAdminClient } from '@/lib/supabase/admin';

type Deps = {
    removeAuthUser?: (id: string) => Promise<void>;
    removeFiles?: (plan: StoragePlan) => Promise<void>;
    planStorage?: typeof planUserStorage;
};

const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

async function removeAuthUserById(id: string): Promise<void> {
    const { error } = await createAdminClient().auth.admin.deleteUser(id);

    if (!error) return;

    const e = error as { status?: number; code?: string };

    if (e.status === 404 || e.code === 'user_not_found') return;

    throw error;
}

export async function deleteAccount(
    userId: string,
    deps: Deps = {}
): Promise<{ deletedCampaigns: number }> {
    const removeAuthUser = deps.removeAuthUser ?? removeAuthUserById;

    const removeFiles = deps.removeFiles ?? removeStoragePlan;

    const blocking = await findBlockingTemplates(userId);

    if (blocking.length) throw new AccountDeleteBlockedError(blocking);

    const owned = await prisma.campaign.findMany({
        where: { dmUserId: userId },
        select: { id: true },
    });

    const campaignIds = owned.map((c) => c.id);

    const plan = await (deps.planStorage ?? planUserStorage)(
        userId,
        campaignIds
    ).catch((e) => {
        console.warn('[account-delete] storage plan failed', errorName(e));

        return [] as StoragePlan;
    });

    const affectedUserIds = await prisma.$transaction(async (tx) => {
        const members = await tx.campaignMember.findMany({
            where: { campaignId: { in: campaignIds } },
            select: { userId: true },
        });

        for (const campaignId of campaignIds)
            await deleteCampaignRows(tx, campaignId);

        // no FK on these, so they would outlive the user
        await tx.assistantReceipt.deleteMany({
            where: { OR: [{ userId }, { campaignId: { in: campaignIds } }] },
        });
        await tx.assistantIntent.deleteMany({ where: { userId } });
        await tx.aiThread.deleteMany({ where: { userId } });
        await tx.apiToken.deleteMany({ where: { userId } });
        await tx.compendiumImportRun.deleteMany({ where: { userId } });
        await tx.battleScene.updateMany({
            where: { ownerUserId: userId },
            data: { ownerUserId: null },
        });

        // characters.controlledBy is NOT NULL, so the FK's SET NULL would abort the delete
        const controlled = await tx.character.findMany({
            where: { controlledBy: userId },
            select: { id: true, campaign: { select: { dmUserId: true } } },
        });

        for (const c of controlled)
            await tx.character.update({
                where: { id: c.id },
                data: { controlledBy: c.campaign.dmUserId },
            });

        await tx.user.deleteMany({ where: { id: userId } });

        return members.map((m) => m.userId).filter((id) => id !== userId);
    }, TX_OPTIONS);

    await invalidateCampaignLists([...affectedUserIds, userId]).catch(
        () => undefined
    );

    await removeFiles(plan).catch((e) =>
        console.warn('[account-delete] storage cleanup failed', errorName(e))
    );

    await removeAuthUser(userId);

    return { deletedCampaigns: campaignIds.length };
}

const errorName = (e: unknown) => (e instanceof Error ? e.name : 'unknown');
