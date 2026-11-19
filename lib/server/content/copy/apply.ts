import { buildCopyPlan,type CopyPlan } from './plan';
import { kindOfTable, nameOf } from './row-names';
import { copyTrackFiles, removeCopiedTrackFiles } from './tracks-files';

import 'server-only';
import { invalidateReference } from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import { withCampaignContentWrite } from '@/lib/server/content/write';
import { afterContentCommit } from '@/lib/server/content/write-context';
import type { Bundle } from '@/lib/server/templates/bundle';
import { exportNames } from '@/lib/server/templates/export-campaign';
import { importBundle } from '@/lib/server/templates/import-bundle';
import { type Actor } from '@/lib/utils/api/actor';
import { ContentError } from '@/lib/utils/api/content-error';
import type { CopyRowRef } from '@/types/content-copy';

const requireKind = (table: string) => {
    const kind = kindOfTable(table);

    if (!kind) throw new ContentError(API_ERRORS.INTERNAL, 500);

    return kind;
};

export const copyRowRef = (
    table: string,
    row: Record<string, unknown>,
    id?: string
): CopyRowRef => ({
    kind: requireKind(table),
    ...(id === undefined ? {} : { id }),
    name: nameOf(row),
});

/** The plan is built under the target's write lock, so concurrent copies cannot duplicate names. */
export async function applyCopy(args: {
    campaignId: string;
    source: Bundle;
    targetActor: Actor;
    selected: Array<{ kind: string; ids: string[] }>;
}): Promise<{ plan: CopyPlan; created: CopyRowRef[] }> {
    const { campaignId } = args;

    return withCampaignContentWrite(campaignId, async (tx) => {
        const plan = await buildCopyPlan({
            source: args.source,
            target: await exportNames(tx, campaignId),
            targetActor: args.targetActor,
            selected: args.selected,
        });

        if (plan.toCreate.length === 0) return { plan, created: [] };

        const copiedFiles = await copyTrackFiles(tx, plan, campaignId);

        try {
            if (plan.toCreate.length === 0) {
                await removeCopiedTrackFiles(copiedFiles);

                return { plan, created: [] };
            }

            const { idMap } = await importBundle(
                tx,
                plan.bundle,
                campaignId,
                undefined,
                { reuse: plan.reuse, detached: true }
            );

            const created = plan.toCreate.map(({ table, row }) => {
                const id = idMap.get(row.id);

                if (!id) throw new ContentError(API_ERRORS.INTERNAL, 500);

                return copyRowRef(table, row, id);
            });

            const refKinds = new Set(
                created.flatMap(
                    (c) =>
                        (
                            CONTENT_RESOURCES as Partial<
                                Record<string, AnyContentResource>
                            >
                        )[c.kind]?.invalidates ?? []
                )
            );

            if (refKinds.size > 0)
                afterContentCommit(() =>
                    invalidateReference([...refKinds], campaignId)
                );

            return { plan, created };
        } catch (error) {
            await removeCopiedTrackFiles(copiedFiles);

            throw error;
        }
    });
}
