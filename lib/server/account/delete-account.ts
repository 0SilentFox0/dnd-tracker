import { invalidateCampaignLists } from '@/lib/cache/campaign-list';
import { invalidateAllReference } from '@/lib/cache/tags';
import { CampaignKind } from '@/lib/constants/campaigns';
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
import { reassignUserParticipants } from '@/lib/server/battles/reassign-user-participants';
import {
    deleteCampaignRows,
    deleteTemplateBaseRows,
} from '@/lib/server/campaigns/delete-campaign-rows';
import { createAdminClient } from '@/lib/supabase/admin';

type Deps = {
    removeAuthUser?: (id: string) => Promise<void>;
    removeFiles?: (plan: StoragePlan) => Promise<void>;
    planStorage?: typeof planUserStorage;
    reassignParticipants?: typeof reassignUserParticipants;
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

    const result = await prisma.$transaction(async (tx) => {
        // locks block concurrent clones/syncs of these templates (FK key-share) until commit
        await tx.$queryRaw`SELECT id FROM campaigns WHERE "dmUserId" = ${userId} AND kind = ${CampaignKind.TEMPLATE} FOR UPDATE`;

        const blocking = await findBlockingTemplates(userId, tx);

        if (blocking.length) throw new AccountDeleteBlockedError(blocking);

        const owned = await tx.campaign.findMany({
            where: { dmUserId: userId },
            select: { id: true, kind: true },
        });

        const campaignIds = owned.map((c) => c.id);

        const templateIds = owned
            .filter((c) => c.kind === CampaignKind.TEMPLATE)
            .map((c) => c.id);

        const members = await tx.campaignMember.findMany({
            where: { campaignId: { in: campaignIds } },
            select: { userId: true },
        });

        const joined = await tx.campaignMember.findMany({
            where: { userId, campaignId: { notIn: campaignIds } },
            select: { campaign: { select: { dmUserId: true } } },
        });

        for (const campaignId of campaignIds)
            await deleteCampaignRows(tx, campaignId);

        await deleteTemplateBaseRows(tx, templateIds);

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

        const affected = new Set([
            ...members.map((m) => m.userId),
            ...joined.map((m) => m.campaign.dmUserId),
            ...controlled.map((c) => c.campaign.dmUserId),
        ]);

        affected.delete(userId);

        return { campaignIds, affectedUserIds: [...affected] };
    }, TX_OPTIONS);

    const { campaignIds, affectedUserIds } = result;

    await invalidateCampaignLists([...affectedUserIds, userId]).catch(
        () => undefined
    );

    try {
        for (const campaignId of campaignIds)
            invalidateAllReference(campaignId);
    } catch (e) {
        console.warn(
            '[account-delete] cache invalidation failed',
            errorName(e)
        );
    }

    // files outlive the DB commit, so a failed plan only leaves orphans to clean up by hand
    const plan = await (deps.planStorage ?? planUserStorage)(
        userId,
        campaignIds
    ).catch((e) => {
        console.error('[account-delete] storage plan failed, files remain', {
            userId,
            campaignIds,
            error: errorName(e),
        });

        return [] as StoragePlan;
    });

    await removeFiles(plan).catch((e) =>
        console.warn('[account-delete] storage cleanup failed', errorName(e))
    );

    // keyed by userId (not the users row) so a retry after the commit still runs it
    await (deps.reassignParticipants ?? reassignUserParticipants)(userId).catch(
        (e) =>
            console.error('[account-delete] battle reassign failed', {
                error: errorName(e),
            })
    );

    await removeAuthUser(userId);

    return { deletedCampaigns: campaignIds.length };
}

const errorName = (e: unknown) => (e instanceof Error ? e.name : 'unknown');
