import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    DETACH_KIND_BY_TABLE,
    detachRefs,
} from '@/lib/server/content/detach-refs';
import { ContentError } from '@/lib/server/content/errors';
import {
    BUNDLE_TABLES,
    type BundleTableDef,
    delegateOf,
    pick,
} from '@/lib/server/templates/bundle';
import {
    collectKeysAndStrings,
    remapIds,
} from '@/lib/server/templates/remap-ids';
import { type SyncDb } from '@/lib/server/templates/sync/context';
import { indexOf } from '@/lib/server/templates/sync/index';
import { assertSrdNameReferences } from '@/lib/server/templates/sync/name-references';
import { createRefChecker } from '@/lib/server/templates/sync/ref-checker';
import { keyOf } from '@/lib/server/templates/sync/selection';
import {
    type SyncContext,
    type SyncItem,
} from '@/lib/server/templates/sync/types';
import { backgroundAsiRules } from '@/lib/utils/backgrounds/asi';
import { backgroundReferenceError } from '@/lib/utils/backgrounds/integrity';

export function needsBlockedDependency(
    item: SyncItem,
    all: Map<string, SyncItem>
) {
    const seen = new Set<string>();

    const queue = [item];

    while (queue.length > 0) {
        for (const req of queue.pop()!.requires) {
            const k = keyOf(req);

            const dep = all.get(k);

            if (
                seen.has(k) ||
                !dep ||
                (dep.status !== 'new' && dep.status !== 'deletedLocally')
            )
                continue;

            if (dep.ignored || dep.status === 'deletedLocally') return true;

            seen.add(k);
            queue.push(dep);
        }
    }

    return false;
}

export function cleanRow(
    t: BundleTableDef,
    src: Record<string, unknown>,
    item: SyncItem,
    map: Map<string, string>,
    warnings: string[]
) {
    const clean = pick(src, t.columns);

    for (const col of Object.keys(t.fks)) {
        const ref = clean[col];

        if (typeof ref === 'string' && !map.has(ref)) {
            if (t.key === 'backgrounds')
                throw new ContentError(API_ERRORS.BACKGROUND_FEAT_INVALID, 422);

            warnings.push(`${t.key} ${item.name}: ${col} → null`);
            clean[col] = null;
        }
    }

    const data = remapIds(clean, map);

    delete data.id;

    return data;
}

export async function deleteRemoved(
    db: SyncDb,
    ctx: SyncContext,
    selected: Map<string, SyncItem>,
    warnings: string[]
): Promise<Set<string>> {
    const blocked = new Set<string>();

    const refs = createRefChecker(db, ctx.campaignId);

    for (const t of [...BUNDLE_TABLES].reverse()) {
        for (const i of selected.values()) {
            if (
                i.scope !== t.key ||
                i.status !== 'deletedInSource' ||
                !i.localId
            )
                continue;

            if (t.key === 'backgrounds') {
                const used = await db.character.findMany({
                    where: {
                        campaignId: ctx.campaignId,
                        backgroundId: i.localId,
                    },
                    select: { id: true },
                });

                if (used.length)
                    throw new ContentError(API_ERRORS.BACKGROUND_IN_USE, 409);
            }

            if (t.key === 'feats') {
                const backgrounds = await db.background.findMany({
                    where: { campaignId: ctx.campaignId },
                });

                if (
                    backgrounds.some(
                        (b) =>
                            b.originFeatId === i.localId ||
                            collectKeysAndStrings(b.choices).has(i.localId!)
                    )
                )
                    throw new ContentError(API_ERRORS.FEAT_IN_USE, 409);
            }

            const blockedWarning = await refs.blockedBy(
                t.key,
                [i.localId],
                i.name
            );

            if (blockedWarning) {
                warnings.push(blockedWarning);
                blocked.add(i.localId);

                continue;
            }

            const kind = DETACH_KIND_BY_TABLE[t.key];

            if (kind) await detachRefs(db, ctx.campaignId, kind, [i.localId]);

            await delegateOf(db, t).deleteMany({
                where: { id: i.localId, campaignId: ctx.campaignId },
            });

            await refs.deleted(t.key);
        }
    }

    return blocked;
}

export async function assertResultingGraph(
    db: SyncDb,
    ctx: SyncContext,
    index: ReturnType<typeof indexOf>,
    selected: Map<string, SyncItem>,
    map: Map<string, string>
) {
    // Validate the resulting graph before any writes, including refs to unchanged local rows.
    const effective = new Map(
        ctx.target.rows.map((r) => [
            r.row.id,
            { table: r.table, row: r.row as Record<string, unknown> },
        ])
    );

    for (const item of selected.values()) {
        if (item.status === 'deletedInSource' && item.localId)
            effective.delete(item.localId);
        else {
            const src = index.sourceIndex.get(item.key);

            const table = src && BUNDLE_TABLES.find((t) => t.key === src.table);

            if (src && table)
                effective.set(item.localId ?? map.get(item.key)!, {
                    table: src.table,
                    row: {
                        ...cleanRow(table, src.row, item, map, []),
                        id: item.localId ?? map.get(item.key)!,
                    },
                });
        }
    }

    const resulting = [...effective.values()];

    // Templates without classes have no providers for spell-list names.
    if (ctx.templateOverlay && ctx.sourceBundle.classes.length > 0) {
        const selectedLocalIds = new Set(
            [...selected.values()]
                .map((item) => item.localId ?? map.get(item.key))
                .filter((id): id is string => !!id)
        );

        assertSrdNameReferences(ctx.target.rows, resulting, selectedLocalIds, {
            rows: [...index.sourceIndex.values()],
            sourceToLocal: map,
        });
    }

    const feats = resulting
        .filter((r) => r.table === 'feats')
        .map(({ row }) => ({ id: row.id, type: row.type }));

    const spells = new Set(
        resulting.filter((r) => r.table === 'spells').map((r) => r.row.id)
    );

    for (const { row } of resulting.filter((r) => r.table === 'backgrounds')) {
        const error = backgroundReferenceError(
            { originFeatId: row.originFeatId, choices: row.choices },
            feats,
            spells
        );

        if (error) {
            const existed = ctx.target.rows.some(
                (r) =>
                    r.table === 'backgrounds' &&
                    r.row.id === row.id &&
                    r.row.originFeatId === row.originFeatId
            );

            throw new ContentError(error, existed ? 409 : 422);
        }
    }

    if (
        [...selected.values()].some(
            (i) => i.scope === 'backgrounds' || i.scope === 'feats'
        )
    ) {
        const characters = await db.character.findMany({
            where: { campaignId: ctx.campaignId },
            select: { backgroundId: true, backgroundChoices: true },
        });

        const signature = (
            row: Record<string, unknown> | undefined,
            lookup: (id: string) => Record<string, unknown> | undefined
        ) => [
            backgroundAsiRules(row?.choices),
            backgroundAsiRules(
                typeof row?.originFeatId === 'string'
                    ? lookup(row.originFeatId)?.choices
                    : []
            ),
        ];

        for (const character of characters) {
            if (!character.backgroundId) continue;

            const old = index.localById.get(character.backgroundId)?.row;

            const next = effective.get(character.backgroundId)?.row;

            if (!next)
                throw new ContentError(API_ERRORS.BACKGROUND_IN_USE, 409);

            if (
                JSON.stringify(
                    signature(old, (id) => index.localById.get(id)?.row)
                ) !==
                JSON.stringify(signature(next, (id) => effective.get(id)?.row))
            )
                throw new ContentError(API_ERRORS.BACKGROUND_ASI_IN_USE, 409);

            for (const id of collectKeysAndStrings(
                character.backgroundChoices
            )) {
                const previous = index.localById.get(id);

                if (previous?.table !== 'feats') continue;

                const updated = effective.get(id)?.row;

                if (!updated)
                    throw new ContentError(API_ERRORS.FEAT_IN_USE, 409);

                if (
                    JSON.stringify(backgroundAsiRules(previous.row.choices)) !==
                    JSON.stringify(backgroundAsiRules(updated.choices))
                )
                    throw new ContentError(
                        API_ERRORS.BACKGROUND_ASI_IN_USE,
                        409
                    );
            }
        }
    }
}
