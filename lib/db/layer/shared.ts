import { AsyncLocalStorage } from 'node:async_hooks';

import { type CampaignLayer, isPlainCampaign, layerStats, markPlainCampaign, type Overlay, overlayCache, overlayKey } from '@/lib/db/layer/cache';
import { BASE_ONLY, type LayerConfig } from '@/lib/db/layer/config';
import { orderKeys } from '@/lib/db/layer/sort';
import { currentContentWrite, currentTransaction, markContentDirty } from '@/lib/server/content/write-context';

/** Runs `run` against the stored tables only: no base rows, no hides, no id exposure. */
export const bypassLayer = <T>(run: () => Promise<T>): Promise<T> =>
    bypass.run(true, async () => run());

export const READS = new Set([
    'findMany',
    'findFirst',
    'findUnique',
    'findFirstOrThrow',
    'findUniqueOrThrow',
    'count',
    'aggregate',
]);

export const WRITES = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

export const UNSUPPORTED_OPS = new Set([
    'upsert',
    'groupBy',
    'createManyAndReturn',
    'updateManyAndReturn',
]);

export const CAMPAIGN_WRITES = new Set([
    'create',
    'createMany',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
]);

export type Row = Record<string, any>;

export type Raw = Record<string, any>;

export type Query = (args: Row) => Promise<any>;

export interface Ctx {
    raw: Raw;
    ext: Raw;
}

export const bypass = new AsyncLocalStorage<true>();

/** Overlays may reflect writes that are not committed (or not yet counted in contentVersion) inside a write context or open transaction. */
export const overlayCachingAllowed = () =>
    !currentContentWrite() && !currentTransaction();

/** Only the campaign that owns the open write context is bumped; rows written for another campaign (clone, template save) leave it alone. */
export const touch = (campaignId: string) => {
    if (currentContentWrite()?.campaignId === campaignId) markContentDirty();
};

export const txOrWrite = (): Raw | undefined =>
    (currentContentWrite()?.db as Raw | undefined) ??
    (currentTransaction() as Raw | undefined);

export const scopeOf = (): object | undefined =>
    (currentContentWrite() as object | undefined) ??
    (currentTransaction() as object | undefined);

/** One layer lookup per campaign inside a write context / transaction; outside one every call reads fresh. */
export const scoped = new WeakMap<object, Map<string, CampaignLayer | null>>();

export const forgetScoped = (campaignId?: string) => {
    const memo = scoped.get(scopeOf() ?? {});

    if (campaignId) memo?.delete(campaignId);
    else memo?.clear();
};

export async function campaignLayer(
    ctx: Ctx,
    campaignId: string
): Promise<CampaignLayer | null> {
    if (isPlainCampaign(campaignId)) return null;

    const scope = scopeOf();

    const memo = scope && scoped.get(scope);

    if (memo?.has(campaignId)) return memo.get(campaignId) ?? null;

    layerStats.campaignLookups += 1;

    const row = await ctx.raw.campaign.findUnique({
        where: { id: campaignId },
        select: { baseSourceId: true, baseVersion: true, contentVersion: true },
    });

    const layer =
        row?.baseSourceId && row.baseVersion != null
            ? {
                  sourceId: row.baseSourceId as string,
                  version: row.baseVersion as number,
                  contentVersion: (row.contentVersion as number) ?? 0,
              }
            : null;

    if (scope) scoped.set(scope, (memo ?? new Map()).set(campaignId, layer));
    else if (row && !row.baseSourceId) markPlainCampaign(campaignId);

    return layer;
}

export function splitWhere(where: Row | undefined): {
    campaignId?: string;
    rest: Row;
} {
    const { campaignId, ...rest } = where ?? {};

    return {
        campaignId: typeof campaignId === 'string' ? campaignId : undefined,
        rest,
    };
}

export function assertSupported(config: LayerConfig, args: Row, rest: Row) {
    for (const key of Object.keys(rest)) {
        if (key === 'AND' || key === 'OR' || key === 'NOT') {
            if (JSON.stringify(rest[key]).includes('campaignId'))
                throw new Error(
                    `LAYER_UNSUPPORTED_NESTED_CAMPAIGN_ID:${config.model}`
                );

            continue;
        }

        if (!config.baseFields.has(key))
            throw new Error(`LAYER_UNSUPPORTED_FILTER:${config.model}.${key}`);
    }

    if (args.cursor || args.distinct)
        throw new Error(`LAYER_UNSUPPORTED_ARGS:${config.model}`);

    for (const [key, dir] of orderKeys(args.orderBy))
        if (!config.baseFields.has(key) || (dir !== 'asc' && dir !== 'desc'))
            throw new Error(`LAYER_UNSUPPORTED_ORDER:${config.model}.${key}`);
}

export const validAt = (layer: CampaignLayer) => ({
    validFrom: { lte: layer.version },
    OR: [{ validTo: null }, { validTo: { gt: layer.version } }],
});

export const toBaseWhere = (rest: Row, layer: CampaignLayer): Row => ({
    AND: [rest, validAt(layer), { sourceCampaignId: layer.sourceId }],
});

export function asLocalShape(row: Row, campaignId: string | undefined): Row {
    const out: Row = {};

    for (const [key, value] of Object.entries(structuredClone(row)))
        if (!BASE_ONLY.has(key)) out[key] = value;

    return { ...out, campaignId, sourceId: row.id, sourceHash: null };
}

/** In a layered campaign an override row (sourceId set) is addressed by its base id; its own cuid never leaves the layer. */
export const expose = (row: Row): Row =>
    row && row.sourceId != null ? { ...row, id: row.sourceId } : row;

/** Local-table filter for a public `id` condition: an override matches by `sourceId`, an ordinary local row by `id`. */
export function publicIdFilter(cond: unknown, model: string): Row {
    const c = cond as Row;

    if (typeof cond === 'string')
        return { OR: [{ id: cond }, { sourceId: cond }] };

    if (c && typeof c === 'object') {
        const keys = Object.keys(c);

        if (keys.length === 1 && (keys[0] === 'equals' || keys[0] === 'in'))
            return { OR: [{ id: cond }, { sourceId: cond }] };

        if (
            keys.length === 1 &&
            (keys[0] === 'notIn' ||
                (keys[0] === 'not' && typeof c.not === 'string'))
        ) {
            const list = keys[0] === 'notIn' ? c.notIn : [c.not];

            return {
                AND: [
                    { id: { notIn: list } },
                    { OR: [{ sourceId: null }, { sourceId: { notIn: list } }] },
                ],
            };
        }
    }

    throw new Error(`LAYER_UNSUPPORTED_FILTER:${model}.id`);
}

export function localWhere(config: LayerConfig, rest: Row, campaignId: string): Row {
    const { id, ...others } = rest;

    return id === undefined
        ? { ...rest, campaignId }
        : { campaignId, AND: [others, publicIdFilter(id, config.model)] };
}

/** The stored row (override or ordinary) that a public id refers to in this campaign. */
export async function localByPublicId(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    id: string
): Promise<{ id: string } | null> {
    const rows: Array<{ id: string; sourceId: string | null }> = await local(
        ctx,
        config
    ).findMany({
        where: { campaignId, OR: [{ sourceId: id }, { id }] },
        select: { id: true, sourceId: true },
    });

    return rows.find((r) => r.sourceId === id) ?? rows[0] ?? null;
}

/** Internal queries on the layered tables themselves (a tx client is also extended) must not re-enter the layer. */
export const local = (ctx: Ctx, config: LayerConfig): Raw =>
    new Proxy(
        {},
        {
            get: (_t, op: string) => async (args: Row) =>
                bypass.run(true, async () => ctx.raw[config.local][op](args)),
        }
    );

export async function overlayOf(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    layer: CampaignLayer
): Promise<Overlay> {
    const key = overlayKey(campaignId, layer, config.model);

    const cacheable = overlayCachingAllowed();

    const hit = cacheable ? overlayCache.get(key) : undefined;

    if (hit) return hit;

    const hidden: Array<{ id: string }> =
        await ctx.raw.campaignContentHide.findMany({
            where: { campaignId, table: config.hideTable },
            select: { id: true },
        });

    const shadowed: Array<{ sourceId: string }> = await local(
        ctx,
        config
    ).findMany({
        where: { campaignId, sourceId: { not: null } },
        select: { sourceId: true },
    });

    const overlay = {
        hidden: new Set(hidden.map((r) => r.id)),
        shadowed: new Set(shadowed.map((r) => r.sourceId)),
    };

    if (cacheable) overlayCache.set(key, overlay);

    return overlay;
}
