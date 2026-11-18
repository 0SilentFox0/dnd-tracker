import { ImportDeps } from './deps';
import { contentErrorIssues } from './issues';
import { Plan, toResult } from './shared';

import 'server-only';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { ContentError } from '@/lib/server/content/errors';
import { tableOfKind } from '@/lib/server/content/import/slug';
import {
    withCampaignContentWrite,
    withCampaignRuntimeWrite,
} from '@/lib/server/content/write';
import { rowHash } from '@/lib/server/templates/sync/hash';
import type { Actor } from '@/lib/utils/api/actor';
import type { ImportKind, ImportRowResult } from '@/types/content-import';

export async function writePlan(
    resource: AnyContentResource,
    actor: Actor,
    plan: Plan,
    kind: ImportKind,
    deps: ImportDeps
) {
    let id = plan.existingId as string;

    if (plan.op === 'create')
        id = ((await resource.create(actor, plan.body)) as { id: string }).id;
    else {
        const existing = await resource.find(actor, id, 'write');

        if (!existing) throw new ContentError(resource.notFound, 404);

        await resource.update(actor, existing, plan.body);
    }

    if (plan.slug && plan.slug !== plan.storedSlug)
        await deps.writeSlug(actor.campaignId, kind, id, plan.slug);
}

class Rollback extends Error {
    constructor(readonly unchanged: boolean) {
        super('rollback');
    }
}

/** Applies the update inside a transaction and compares the stored row before and after; an unchanged row is rolled back. */
export async function applyIfChanged(
    resource: AnyContentResource,
    actor: Actor,
    plan: Plan,
    kind: ImportKind,
    deps: ImportDeps,
    commit: boolean
): Promise<boolean> {
    const table = tableOfKind(kind);

    try {
        await withCampaignContentWrite(actor.campaignId, async () => {
            const before = (await resource.find(
                actor,
                plan.existingId as string,
                'write'
            )) as Record<string, unknown> | null;

            if (!before) throw new ContentError(resource.notFound, 404);

            await resource.update(actor, before, plan.body);

            const after = (await resource.find(
                actor,
                plan.existingId as string,
                'write'
            )) as Record<string, unknown>;

            if (rowHash(before, table) === rowHash(after, table))
                throw new Rollback(true);

            if (!commit) throw new Rollback(false);

            if (plan.slug && plan.slug !== plan.storedSlug)
                await deps.writeSlug(
                    actor.campaignId,
                    kind,
                    plan.existingId as string,
                    plan.slug
                );
        });

        return true;
    } catch (error) {
        if (!(error instanceof Rollback)) throw error;

        if (
            error.unchanged &&
            commit &&
            plan.slug &&
            plan.slug !== plan.storedSlug
        )
            await withCampaignRuntimeWrite(actor.campaignId, () =>
                deps.writeSlug(
                    actor.campaignId,
                    kind,
                    plan.existingId as string,
                    plan.slug as string
                )
            );

        return !error.unchanged;
    }
}

export async function prepareBody(
    resource: AnyContentResource,
    actor: Actor,
    plan: Plan,
    create: boolean
) {
    if (create) {
        if (resource.prepareCreate)
            plan.body = await resource.prepareCreate(actor, plan.body);

        return;
    }

    if (!resource.prepareUpdate) return;

    const current = await resource.find(
        actor,
        plan.existingId as string,
        'write'
    );

    if (!current) throw new ContentError(resource.notFound, 404);

    plan.body = await resource.prepareUpdate(actor, current, plan.body);
}

export async function checkPlan(
    resource: AnyContentResource,
    actor: Actor,
    plan: Plan
): Promise<ImportRowResult> {
    if (plan.status !== 'pending' || !resource.checkImport)
        return toResult(plan);

    try {
        await resource.checkImport(actor, plan.body);

        return toResult(plan);
    } catch (error) {
        if (!(error instanceof ContentError)) throw error;

        return {
            ...toResult(plan),
            status: 'error',
            issues: [...plan.issues, ...contentErrorIssues(error)],
        };
    }
}
