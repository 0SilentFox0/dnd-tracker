import type { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { bypassLayer } from '@/lib/db/content-layer';
import { layeredModels } from '@/lib/db/layer/config';
import { ContentError } from '@/lib/server/content/errors';
import {
    BUNDLE_TABLES,
    type BundleTable,
    type BundleTableDef,
    delegateOf,
} from '@/lib/server/templates/bundle';
import { collectKeysAndStrings } from '@/lib/server/templates/remap-ids';
import {
    changed,
    item,
    pairStatus,
    rowName,
} from '@/lib/server/templates/sync/classify';
import type { SyncDb } from '@/lib/server/templates/sync/context';
import { rowHash } from '@/lib/server/templates/sync/hash';
import { emptyState, getEntry } from '@/lib/server/templates/sync/state';
import type {
    SyncContext,
    SyncItem,
    SyncState,
} from '@/lib/server/templates/sync/types';
import { canReadSource } from '@/lib/utils/api/is-dm';
import type { SourceSyncScope } from '@/types/campaigns';

export type LayeredDb = SyncDb &
    Pick<Prisma.TransactionClient, 'campaignContentHide'>;

export interface LayerRef {
    sourceId: string;
    baseVersion: number;
}

type Row = Record<string, unknown> & { id: string };

type Window = { validFrom: number; validTo: number | null };

export interface LayeredEntry {
    t: BundleTableDef;
    key: string;
    baseline?: Row;
    source?: Row;
    override?: { localId: string; row: Row; sourceHash: string | null };
    hidden: boolean;
}

export interface LayeredContext {
    campaignId: string;
    source: SyncContext['source'];
    baseVersion: number;
    entries: LayeredEntry[];
    ignored: SyncState;
    syncedAt: Date | null;
}

interface BaseDelegate {
    findMany(args: unknown): Promise<Array<Row & Window>>;
}

const baseDelegate = (db: object, t: BundleTableDef) =>
    (db as Record<string, BaseDelegate>)[layeredModels()[t.model].base];

/** Ignored-state key marking a base row hidden only because the DM did not take it while `baseVersion` advanced (not a DM deletion). */
const PENDING_PREFIX = 'pending:';

export const pendingKey = (key: string) => `${PENDING_PREFIX}${key}`;

const visibleAt = (version: number) => (r: Window) =>
    r.validFrom <= version && (r.validTo === null || r.validTo > version);

export async function layerOf(
    db: Pick<Prisma.TransactionClient, 'campaign'>,
    campaignId: string
): Promise<LayerRef | null> {
    const row = await db.campaign.findUnique({
        where: { id: campaignId },
        select: { baseSourceId: true, baseVersion: true },
    });

    return row?.baseSourceId && row.baseVersion != null
        ? { sourceId: row.baseSourceId, baseVersion: row.baseVersion }
        : null;
}

export async function loadLayeredContext(
    db: LayeredDb,
    campaignId: string,
    layer: LayerRef,
    access?: { userId: string }
): Promise<LayeredContext> {
    const found = await db.campaign.findUnique({
        where: { id: layer.sourceId },
        select: {
            id: true,
            name: true,
            kind: true,
            contentVersion: true,
            visibility: true,
            members: {
                where: { userId: access?.userId ?? '' },
                select: { role: true },
            },
        },
    });

    if (!found) throw new ContentError(API_ERRORS.SOURCE_NOT_FOUND, 404);

    if (access && !canReadSource(found.visibility, found.members))
        throw new ContentError(API_ERRORS.SOURCE_FORBIDDEN, 403);

    const version = found.contentVersion;

    const [hides, state] = await Promise.all([
        db.campaignContentHide.findMany({ where: { campaignId } }),
        db.campaignSourceSync.findUnique({ where: { campaignId } }),
    ]);

    const entries: LayeredEntry[] = [];

    const ignored = (state?.ignored ?? emptyState()) as Partial<SyncState>;

    for (const t of BUNDLE_TABLES) {
        const hidden = new Set(
            hides
                .filter((h) => h.table === layeredModels()[t.model].hideTable)
                .map((h) => h.id)
        );

        const pending = Object.keys(ignored.tables?.[t.key] ?? {})
            .filter((k) => k.startsWith(PENDING_PREFIX))
            .map((k) => k.slice(PENDING_PREFIX.length));

        entries.push(
            ...(await loadTable(
                db,
                campaignId,
                layer,
                version,
                t,
                hidden,
                pending
            ))
        );
    }

    return {
        campaignId,
        source: {
            id: found.id,
            name: found.name,
            kind: found.kind,
            contentVersion: version,
        },
        baseVersion: layer.baseVersion,
        entries,
        ignored: {
            tables: ignored.tables ?? {},
            rules: ignored.rules ?? {},
            settings: ignored.settings,
        },
        syncedAt: state?.syncedAt ?? null,
    };
}

async function loadTable(
    db: LayeredDb,
    campaignId: string,
    layer: LayerRef,
    version: number,
    t: BundleTableDef,
    hidden: Set<string>,
    pending: string[]
): Promise<LayeredEntry[]> {
    const base = baseDelegate(db, t);

    const bv = layer.baseVersion;

    const changedRows = await base.findMany({
        where: {
            sourceCampaignId: layer.sourceId,
            OR: [{ validFrom: { gt: bv } }, { validTo: { gt: bv } }],
        },
    });

    const overrides = (await bypassLayer(() =>
        delegateOf(db, t).findMany({
            where: { campaignId, sourceId: { not: null } },
        })
    )) as Array<Row & { sourceId: string; sourceHash: string | null }>;

    const byKey = new Map<string, Row[]>();

    for (const r of changedRows)
        byKey.set(r.id, [...(byKey.get(r.id) ?? []), r]);

    const unchanged = [
        ...new Set([...overrides.map((o) => o.sourceId), ...pending]),
    ].filter((id) => !byKey.has(id));

    const unchangedRows = unchanged.length
        ? await base.findMany({
              where: {
                  sourceCampaignId: layer.sourceId,
                  id: { in: unchanged },
              },
          })
        : [];

    const entries: LayeredEntry[] = [];

    const overrideByKey = new Map(overrides.map((o) => [o.sourceId, o]));

    for (const key of [...byKey.keys(), ...unchanged]) {
        const rows = (byKey.get(key) ??
            unchangedRows.filter((r) => r.id === key)) as Array<Row & Window>;

        const override = overrideByKey.get(key);

        entries.push({
            t,
            key,
            baseline: rows.find(visibleAt(bv)),
            source: rows.find(visibleAt(version)),
            override: override && {
                localId: override.id,
                row: override,
                sourceHash: override.sourceHash,
            },
            hidden: hidden.has(key),
        });
    }

    return entries;
}

export function classifyLayered(
    ctx: Pick<LayeredContext, 'entries' | 'ignored'>
): SyncItem[] {
    const out: SyncItem[] = [];

    for (const e of ctx.entries) {
        const s = e.source ? rowHash(e.source, e.t) : null;

        const b = e.baseline ? rowHash(e.baseline, e.t) : undefined;

        let status: SyncItem['status'] | null;

        let visible = true;

        let changedFields: string[] = [];

        if (
            e.hidden &&
            s &&
            getEntry(
                ctx.ignored,
                e.t.key as SourceSyncScope,
                pendingKey(e.key)
            ) !== undefined
        )
            status = 'new';
        else if (e.hidden) {
            if (!s || b === undefined) continue;

            status = 'deletedLocally';
            visible = s !== b;
        } else if (e.override) {
            const local = { ...e.override.row, id: e.key };

            if (!s) status = 'deletedInSource';
            else {
                status = pairStatus(
                    s,
                    e.override.sourceHash ?? b,
                    rowHash(local, e.t)
                );
                changedFields = changed(e.source!, local, e.t.columns);
            }
        } else if (!s) status = b === undefined ? null : 'deletedInSource';
        else status = b === undefined ? 'new' : s !== b ? 'updated' : null;

        if (!status) continue;

        out.push(
            item(ctx, {
                scope: e.t.key,
                key: e.key,
                localId: e.override?.localId ?? null,
                name: rowName(e.source ?? e.override?.row ?? e.baseline!),
                status,
                changedFields,
                sourceHash: s,
                visible,
            })
        );
    }

    return withRequires(ctx.entries, out);
}

/** A selected row drags in the new/hidden rows it references (closeOverRequires keeps only those), so the layer never points at a hidden row. */
function withRequires(entries: LayeredEntry[], items: SyncItem[]): SyncItem[] {
    const byKey = new Map(items.map((i) => [i.key, i]));

    const sources = new Map(
        entries
            .filter((e) => e.source)
            .map((e) => [`${e.t.key}:${e.key}`, e.source!])
    );

    return items.map((i) => {
        const src =
            i.status === 'deletedInSource'
                ? undefined
                : sources.get(`${i.scope}:${i.key}`);

        if (!src) return i;

        const requires: SyncItem['requires'] = [...collectKeysAndStrings(src)]
            .filter((v) => v !== i.key && byKey.has(v))
            .map((v) => ({
                scope: byKey.get(v)!
                    .scope as SyncItem['requires'][number]['scope'],
                key: v,
                name: byKey.get(v)!.name,
            }));

        return requires.length ? { ...i, requires } : i;
    });
}

export const tableOf = (scope: string): BundleTableDef | undefined =>
    BUNDLE_TABLES.find((t) => t.key === (scope as BundleTable));
