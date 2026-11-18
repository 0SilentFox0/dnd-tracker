import type { Prisma } from '@prisma/client';

import { assertResultingGraph, cleanRow, deleteRemoved } from './graph';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { getTranslator } from '@/lib/i18n/translator';
import type { CompendiumBundleDb } from '@/lib/server/compendium-import/bundle';
import { syncCompendiumProvenance } from '@/lib/server/compendium-import/sync';
import { ContentError } from '@/lib/server/content/errors';
import { systemTemplateHooks } from '@/lib/server/systems/registry';
import {
    assertNoLeak,
    findForeignContentIds,
} from '@/lib/server/templates/assert-no-leak';
import {
    BUNDLE_TABLES,
    delegateOf,
    settingsOf,
    TemplateLeakError,
    toPrismaJson,
} from '@/lib/server/templates/bundle';
import { newContentId } from '@/lib/server/templates/ids';
import { collectKeysAndStrings } from '@/lib/server/templates/remap-ids';
import { dropTakenSlugs } from '@/lib/server/templates/slug-collisions';
import { type SyncDb } from '@/lib/server/templates/sync/context';
import { indexOf } from '@/lib/server/templates/sync/index';
import { danglingWarnings } from '@/lib/server/templates/sync/ref-checker';
import { sourceChanged } from '@/lib/server/templates/sync/selection';
import { cloneState, setEntry } from '@/lib/server/templates/sync/state';
import {
    IGNORED_DELETED,
    type SyncContext,
    type SyncItem,
} from '@/lib/server/templates/sync/types';
import { localeOrRequest } from '@/lib/utils/api/translate-error';
import { parseRules } from '@/lib/utils/rules/schema';

export async function writeTables(
    db: SyncDb,
    ctx: SyncContext,
    selected: Map<string, SyncItem>
): Promise<string[]> {
    const warnings: string[] = [];

    const index = indexOf(ctx);

    const map = new Map(index.sourceToLocal);

    for (const i of selected.values())
        if (i.status === 'new' || i.status === 'deletedLocally')
            map.set(i.key, newContentId());

    await assertResultingGraph(db, ctx, index, selected, map);

    const written: unknown[] = [];

    for (const t of BUNDLE_TABLES) {
        const toCreate: Record<string, unknown>[] = [];

        const taken = new Map(
            ctx.target.rows
                .filter((r) => r.table === t.key && r.row.slug)
                .map((r) => [String(r.row.slug), r.row.id])
        );

        const slugs = new Map(
            dropTakenSlugs(
                ctx.sourceBundle[t.key]
                    .filter((src) => selected.has(`${t.key}:${src.id}`))
                    .map((src) => ({
                        id:
                            selected.get(`${t.key}:${src.id}`)!.localId ??
                            map.get(src.id)!,
                        slug: src.slug as string | null | undefined,
                    })),
                taken
            ).map((r) => [r.id, r.slug ?? null])
        );

        for (const src of ctx.sourceBundle[t.key]) {
            const item = selected.get(`${t.key}:${src.id}`);

            if (!item) continue;

            const data = cleanRow(t, src, item, map, warnings);

            if ('slug' in data)
                data.slug = slugs.get(item.localId ?? map.get(src.id)!) ?? null;

            written.push(data);

            if (item.localId) {
                const { count } = await delegateOf(db, t).updateMany({
                    where: { id: item.localId, campaignId: ctx.campaignId },
                    data: toPrismaJson(
                        { ...data, sourceHash: item.sourceHash },
                        t
                    ),
                });

                if (count !== 1) throw sourceChanged();

                await systemTemplateHooks('afterSyncUpdate')[t.key]?.(db, {
                    campaignId: ctx.campaignId,
                    before: indexOf(ctx).localById.get(item.localId)?.row,
                    after: data,
                });
            } else {
                toCreate.push(
                    toPrismaJson(
                        {
                            ...data,
                            id: map.get(src.id),
                            campaignId: ctx.campaignId,
                            sourceId: src.id,
                            sourceHash: item.sourceHash,
                        },
                        t
                    )
                );
            }
        }

        if (toCreate.length > 0)
            await delegateOf(db, t).createMany({ data: toCreate });
    }

    await assertWritable(
        db,
        ctx,
        written,
        index.sourceIds,
        new Set(map.values())
    );

    const blocked = await deleteRemoved(db, ctx, selected, warnings);

    warnings.push(...(await danglingWarnings(db, ctx.campaignId)));

    if (db.compendiumEntry && db.compendiumSource) {
        await syncCompendiumProvenance(
            db as CompendiumBundleDb,
            ctx.sourceBundle.compendium,
            ctx.campaignId,
            map,
            new Set(
                [...selected.values()]
                    .filter((i) => i.status !== 'deletedInSource')
                    .map((i) => i.key)
            )
        );
        for (const item of selected.values())
            if (
                item.status === 'deletedInSource' &&
                item.localId &&
                !blocked.has(item.localId)
            )
                await db.compendiumEntry.deleteMany({
                    where: {
                        campaignId: ctx.campaignId,
                        localId: item.localId,
                    },
                });
    }

    if (ctx.sourceBundle.compendium?.pages.length)
        warnings.push(
            (await getTranslator(await localeOrRequest(), 'campaigns'))(
                'sync.compendiumNotSynced'
            )
        );

    return warnings;
}

async function assertWritable(
    db: SyncDb,
    ctx: SyncContext,
    written: unknown[],
    sourceIds: Set<string>,
    newIds: Set<string>
) {
    try {
        assertNoLeak(written, sourceIds);
    } catch (error) {
        if (error instanceof TemplateLeakError)
            throw new ContentError(API_ERRORS.SOURCE_LEAK, 422);

        throw error;
    }

    const own = new Set([...indexOf(ctx).localById.keys(), ...newIds]);

    const foreign = await findForeignContentIds(
        db,
        collectKeysAndStrings(written),
        own
    );

    if (foreign.length > 0)
        throw new ContentError(API_ERRORS.SOURCE_FOREIGN_IDS, 422);
}

export async function writeCampaign(
    db: SyncDb,
    ctx: SyncContext,
    selected: SyncItem[]
) {
    const rules = selected.filter((i) => i.scope === 'rules');

    const settings = selected.some((i) => i.scope === 'settings');

    const credits = ctx.sourceBundle.credits ?? null;

    const creditsChanged = credits !== (ctx.target.credits ?? null);

    if (rules.length === 0 && !settings && !creditsChanged) return;

    const src = parseRules(ctx.sourceBundle.rules) as Record<string, unknown>;

    const next = {
        ...(parseRules(ctx.target.rules) as Record<string, unknown>),
    };

    for (const r of rules) next[r.key] = src[r.key];

    await db.campaign.update({
        where: { id: ctx.campaignId },
        data: {
            ...(rules.length > 0 && { rules: next as Prisma.InputJsonObject }),
            ...(settings && settingsOf(ctx.sourceBundle.settings)),
            ...(creditsChanged && { credits }),
        },
    });
}

export async function saveState(
    db: SyncDb,
    ctx: SyncContext,
    selected: SyncItem[],
    ignored: SyncItem[]
) {
    const baseline = cloneState(ctx.baseline);

    const ign = cloneState(ctx.ignored);

    for (const i of selected) {
        setEntry(
            baseline,
            i.scope,
            i.key,
            i.status === 'deletedInSource' ? undefined : i.sourceHash!
        );
        setEntry(ign, i.scope, i.key, undefined);
    }

    for (const i of ignored)
        setEntry(ign, i.scope, i.key, i.sourceHash ?? IGNORED_DELETED);

    // deleted on both sides: no S, no local row
    const { sourceIds, sourceToLocal } = indexOf(ctx);

    for (const t of BUNDLE_TABLES)
        for (const k of Object.keys(baseline.tables[t.key] ?? {}))
            if (!sourceIds.has(k) && !sourceToLocal.has(k))
                delete baseline.tables[t.key]![k];

    const data = {
        sourceCampaignId: ctx.source.id,
        sourceVersion: ctx.source.contentVersion,
        baseline: baseline as Prisma.InputJsonObject,
        ignored: ign as Prisma.InputJsonObject,
        syncedAt: new Date(),
    };

    await db.campaignSourceSync.upsert({
        where: { campaignId: ctx.campaignId },
        create: { campaignId: ctx.campaignId, ...data },
        update: data,
    });
}
