import type { Prisma } from '@prisma/client';

import {
    applyIfChanged,
    checkPlan,
    prepareBody,
    writePlan,
} from './import-content/apply';
import { DEFAULT_IMPORT_DEPS, ImportDeps } from './import-content/deps';
import { contentErrorIssues } from './import-content/issues';
import { PlanCtx, planRow } from './import-content/plan';
import { err, indexNames, Plan, toResult } from './import-content/shared';

import 'server-only';
import { invalidateReference } from '@/lib/cache/tags';
import { AI_LIMITS } from '@/lib/constants/ai';
import { API_ERRORS } from '@/lib/constants/api-errors';
import type { ContentImportInput } from '@/lib/schemas/content-import';
import { assertCan } from '@/lib/server/content/access';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { ContentError } from '@/lib/server/content/errors';
import {
    withBatchedContentBump,
    withCampaignContentWrite,
} from '@/lib/server/content/write';
import {
    afterContentCommit,
    currentContentWrite,
    markContentDirty,
} from '@/lib/server/content/write-context';
import type { Actor } from '@/lib/utils/api/actor';
import { NEED } from '@/lib/utils/api/need';
import {
    emptyCounts,
    IMPORT_SPECS,
    refKindsOf,
} from '@/lib/utils/content/import';
import type {
    ImportKind,
    ImportReport,
    ImportRowResult,
} from '@/types/content-import';

function report(dryRun: boolean, results: ImportRowResult[]): ImportReport {
    const counts = emptyCounts();

    for (const r of results) counts[r.status] += 1;

    return { dryRun, results, counts };
}

type ImportRun = {
    actor: Actor;
    kind: ImportKind;
    resource: AnyContentResource;
    deps: ImportDeps;
};

async function dryRunReport(
    { actor, kind, resource, deps }: ImportRun,
    plans: Plan[]
): Promise<ImportReport> {
    const checked = await Promise.all(
        plans.map((plan) => checkPlan(resource, actor, plan))
    );

    if (!deps.skipUnchanged) return report(true, checked);

    for (const [i, plan] of plans.entries()) {
        if (
            plan.status !== 'pending' ||
            plan.op !== 'update' ||
            checked[i].status !== 'updated'
        )
            continue;

        await prepareBody(resource, actor, plan, false);

        if (!(await applyIfChanged(resource, actor, plan, kind, deps, false)))
            checked[i] = { ...checked[i], status: 'skipped' };
    }

    return report(true, checked);
}

async function writeRow(
    { actor, kind, resource, deps }: ImportRun,
    plan: Plan
) {
    if (deps.transactional) {
        const current = currentContentWrite();

        if (current) {
            const tx = current.db as Prisma.TransactionClient;

            await tx.$executeRaw`SAVEPOINT assistant_import_row`;
            try {
                await writePlan(resource, actor, plan, kind, deps);
                markContentDirty();
                await tx.$executeRaw`RELEASE SAVEPOINT assistant_import_row`;
            } catch (error) {
                await tx.$executeRaw`ROLLBACK TO SAVEPOINT assistant_import_row`;
                await tx.$executeRaw`RELEASE SAVEPOINT assistant_import_row`;
                throw error;
            }
        } else
            await withCampaignContentWrite(actor.campaignId, () =>
                writePlan(resource, actor, plan, kind, deps)
            );
    } else await writePlan(resource, actor, plan, kind, deps);
}

export async function importContent(
    actor: Actor,
    kind: ImportKind,
    input: ContentImportInput,
    deps: ImportDeps = DEFAULT_IMPORT_DEPS
): Promise<ImportReport> {
    assertCan(actor, NEED.write);

    await deps.assertKind?.(actor, kind);

    const spec = IMPORT_SPECS[kind];

    const resource = deps.resource(kind);

    const refKinds = refKindsOf(spec);

    const [own, ...refLists] = await Promise.all([
        deps.loadKeys(actor.campaignId, kind),
        ...refKinds.map((k) => deps.loadKeys(actor.campaignId, k)),
    ]);

    const ctx: PlanCtx = {
        spec,
        resource,
        mode: input.mode,
        existing: indexNames(own),
        refs: new Map(refKinds.map((k, i) => [k, indexNames(refLists[i])])),
        seen: new Set(),
        seenSlugs: new Set(),
        incomingSlugs: new Set(
            input.rows.flatMap((r) =>
                typeof r.slug === 'string' && r.slug ? [r.slug] : []
            )
        ),
        claimed: new Set(),
    };

    const plans = input.rows.map((raw, i) => planRow(raw, i + 1, ctx));

    const run: ImportRun = { actor, kind, resource, deps };

    if (input.dryRun) return dryRunReport(run, plans);

    return withBatchedContentBump(actor.campaignId, async () => {
        const results: ImportRowResult[] = [];

        let wrote = false;

        for (const plan of plans) {
            if (plan.status !== 'pending') {
                results.push(toResult(plan));
                continue;
            }

            try {
                await prepareBody(resource, actor, plan, plan.op === 'create');

                if (plan.op === 'update' && deps.skipUnchanged) {
                    if (
                        await applyIfChanged(
                            resource,
                            actor,
                            plan,
                            kind,
                            deps,
                            true
                        )
                    ) {
                        wrote = true;
                        results.push(toResult(plan));
                    } else {
                        plan.status = 'skipped';
                        results.push(toResult(plan));
                    }

                    continue;
                }

                await writeRow(run, plan);

                wrote = true;
                results.push(toResult(plan));
            } catch (error) {
                if (!(error instanceof ContentError))
                    console.error(
                        '[content import]',
                        kind,
                        error instanceof Error ? error.name : 'unknown'
                    );

                results.push({
                    ...toResult(plan),
                    status: 'error',
                    issues: [
                        ...plan.issues,
                        ...(error instanceof ContentError
                            ? contentErrorIssues(error)
                            : [err(API_ERRORS.IMPORT_ROW_FAILED)]),
                    ],
                });
            }
        }

        if (wrote && resource.invalidates.length > 0)
            afterContentCommit(() =>
                (deps.invalidate ?? invalidateReference)(
                    resource.invalidates,
                    actor.campaignId
                )
            );

        return report(false, results);
    });
}

export function compactImportReport(r: ImportReport, limit = 50) {
    const notable = r.results.filter(
        (x) => x.status === 'error' || x.issues.length > 0
    );

    const compact = (n: number) => ({
        dryRun: r.dryRun,
        counts: r.counts,
        rows: notable.slice(0, n),
        omitted: Math.max(0, notable.length - n),
    });

    let n = limit;

    while (
        n > 1 &&
        JSON.stringify(compact(n)).length > AI_LIMITS.toolResultChars
    )
        n = Math.floor(n / 2);

    return compact(n);
}

export {
    DEFAULT_IMPORT_DEPS,
    type ImportDeps,
    OFFLINE_IMPORT_DEPS,
} from './import-content/deps';
