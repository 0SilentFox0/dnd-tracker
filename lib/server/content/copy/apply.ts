import type { CopyPlan } from './plan';

import 'server-only';
import { invalidateReference } from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import { withCampaignContentWrite } from '@/lib/server/content/write';
import { afterContentCommit } from '@/lib/server/content/write-context';
import { tableOfKind } from '@/lib/server/templates/bundle';
import { importBundle } from '@/lib/server/templates/import-bundle';
import { ContentError } from '@/lib/utils/api/content-error';
import type { CopyRowRef } from '@/types/content-copy';

const kindOfTable = (table: string) => {
    const kind = CONTENT_KINDS.find((k) => tableOfKind(k)?.key === table);

    if (!kind) throw new ContentError(API_ERRORS.INTERNAL, 500);

    return kind;
};

export const copyRowRef = (
    table: string,
    row: Record<string, unknown>,
    id?: string
): CopyRowRef => ({
    kind: kindOfTable(table),
    ...(id === undefined ? {} : { id }),
    name: String(row.name ?? row.title ?? row.id),
});

export async function applyCopyPlan(
    campaignId: string,
    plan: CopyPlan
): Promise<CopyRowRef[]> {
    if (plan.toCreate.length === 0) return [];

    return withCampaignContentWrite(campaignId, async (tx) => {
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

        return created;
    });
}
