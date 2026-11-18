import { needsBlockedDependency } from './apply/graph';
import { saveState, writeCampaign, writeTables } from './apply/write';

import { SYNC_DEFAULT_ON } from '@/lib/constants/source-sync';
import type { SourceSyncApplyInput } from '@/lib/schemas/source-sync';
import { classify } from '@/lib/server/templates/sync/classify';
import {
    loadSyncContext,
    type SyncDb,
} from '@/lib/server/templates/sync/context';
import { indexOf } from '@/lib/server/templates/sync/index';
import { type LayeredDb, layerOf } from '@/lib/server/templates/sync/layered';
import {
    applyLayered,
    previewLayeredSelection,
} from '@/lib/server/templates/sync/layered-apply';
import { keyOf, sourceSelection } from '@/lib/server/templates/sync/selection';
import {
    type SyncContext,
    type SyncItem,
} from '@/lib/server/templates/sync/types';
import { parseRules } from '@/lib/utils/rules/schema';
import type { SourceApplyResult } from '@/types/campaigns';

async function loadClassified(
    db: SyncDb,
    campaignId: string,
    access?: { userId: string }
) {
    const ctx = await loadSyncContext(db, campaignId, access);

    return { ctx, all: new Map(classify(ctx).map((i) => [keyOf(i), i])) };
}

export async function previewSourceSelection(
    db: SyncDb,
    campaignId: string,
    body: SourceSyncApplyInput,
    access?: { userId: string }
) {
    const layer = await layerOf(db, campaignId);

    if (layer)
        return previewLayeredSelection(
            db as LayeredDb,
            campaignId,
            layer,
            body,
            access
        );

    const { ctx, all } = await loadClassified(db, campaignId, access);

    const { items, ignored, autoAdded } = sourceSelection(all, body);

    const index = indexOf(ctx);

    return {
        sourceId: ctx.source.id,
        items: items.map((item) => ({
            ...item,
            before: item.localId
                ? (index.localById.get(item.localId)?.row ?? null)
                : item.scope === 'rules'
                  ? parseRules(ctx.target.rules)[
                        item.key as keyof ReturnType<typeof parseRules>
                    ]
                  : item.scope === 'settings'
                    ? ctx.target.settings
                    : null,
            after:
                item.status === 'deletedInSource'
                    ? null
                    : (index.sourceIndex.get(item.key)?.row ??
                      (item.scope === 'rules'
                          ? parseRules(ctx.sourceBundle.rules)[
                                item.key as keyof ReturnType<typeof parseRules>
                            ]
                          : item.scope === 'settings'
                            ? ctx.sourceBundle.settings
                            : null)),
        })),
        ignored,
        autoAdded,
        credits: {
            before: ctx.target.credits ?? null,
            after: ctx.sourceBundle.credits ?? null,
        },
    };
}

async function applySelection(
    db: SyncDb,
    ctx: SyncContext,
    all: Map<string, SyncItem>,
    body: SourceSyncApplyInput
): Promise<SourceApplyResult> {
    const { selected, autoAdded, items, ignored } = sourceSelection(all, body);

    const warnings = await writeTables(db, ctx, selected);

    await writeCampaign(db, ctx, items);

    await saveState(db, ctx, items, ignored);

    return {
        applied: items.length,
        ignored: ignored.length,
        autoAdded: autoAdded.map(({ scope, key, name }) => ({
            scope,
            key,
            name,
        })),
        warnings,
    };
}

export async function applySourceChanges(
    db: SyncDb,
    campaignId: string,
    body: SourceSyncApplyInput,
    access?: { userId: string }
): Promise<SourceApplyResult> {
    const layer = await layerOf(db, campaignId);

    if (layer)
        return applyLayered(db as LayeredDb, campaignId, layer, body, access);

    const { ctx, all } = await loadClassified(db, campaignId, access);

    return applySelection(db, ctx, all, body);
}

export async function applySafeSourceChanges(
    db: SyncDb,
    campaignId: string,
    access?: { userId: string }
): Promise<SourceApplyResult> {
    const layer = await layerOf(db, campaignId);

    if (layer)
        return applyLayered(db as LayeredDb, campaignId, layer, 'safe', access);

    const { ctx, all } = await loadClassified(db, campaignId, access);

    const safe = [...all.values()].filter(
        (i) =>
            i.visible &&
            !i.ignored &&
            SYNC_DEFAULT_ON.has(i.status) &&
            !needsBlockedDependency(i, all)
    );

    return applySelection(db, ctx, all, {
        apply: safe.map(({ scope, key, sourceHash, status }) => ({
            scope,
            key,
            sourceHash,
            status,
        })),
        ignore: [],
    });
}
