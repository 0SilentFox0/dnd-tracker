import { Prisma } from '@prisma/client';

import { baseRowsCache, baseRowsKey, type CampaignLayer } from '@/lib/db/layer/cache';
import { type LayerConfig, layeredModels, otherRelationKeys, type Relation } from '@/lib/db/layer/config';
import { asLocalShape, assertSupported, campaignLayer, type Ctx, expose, local, localWhere, overlayOf, type Query, type Row, splitWhere, toBaseWhere } from '@/lib/db/layer/shared';
import { orderKeys, sortRows } from '@/lib/db/layer/sort';
import { stableStringify } from '@/lib/utils/battle/store/stable-json';

export const SIGNATURE_MAX = 600;

/** `id: "x"` / `id: { in: [...] }` only: answered from the full cached table instead of a cache entry per id set. */
export function idsOnly(rest: Row): string[] | null {
    const keys = Object.keys(rest);

    if (keys.length !== 1 || keys[0] !== 'id') return null;

    const id = rest.id;

    if (typeof id === 'string') return [id];

    if (
        id &&
        typeof id === 'object' &&
        Object.keys(id).length === 1 &&
        Array.isArray(id.in)
    )
        return id.in;

    return null;
}

/** Base rows visible at the campaign's version (before hides and overrides); shared across campaigns via the base cache. */
export async function baseVisible(
    ctx: Ctx,
    config: LayerConfig,
    layer: CampaignLayer,
    rest: Row
): Promise<Row[]> {
    const ids = idsOnly(rest);

    const signature = ids ? '*' : stableStringify(rest);

    const cacheable = signature.length <= SIGNATURE_MAX;

    if (!cacheable)
        return ctx.raw[config.base].findMany({
            where: toBaseWhere(rest, layer),
        });

    const key = baseRowsKey(layer, config.model, signature);

    let rows = baseRowsCache.get(key) as Row[] | undefined;

    if (!rows) {
        rows = (await ctx.raw[config.base].findMany({
            where: toBaseWhere(ids ? {} : rest, layer),
        })) as Row[];

        baseRowsCache.set(key, rows);
    }

    if (!ids) return rows;

    const wanted = new Set(ids);

    return rows.filter((r) => wanted.has(r.id));
}

export interface Plan {
    rels: Record<string, Row>;
    foreign: string[];
    localArgs: Row;
    project: (rows: Row[]) => Row[];
}

/** Splits an `include`/`select` into what the local query can answer and the layered relations resolved afterwards. */
export function planArgs(
    config: LayerConfig,
    args: Row,
    extraSelect: string[] = []
): Plan {
    const rels: Record<string, Row> = {};

    const foreign: string[] = [];

    const others = otherRelationKeys(config.model);

    for (const source of [args.include, args.select] as Array<
        Row | undefined
    >) {
        for (const [key, value] of Object.entries(source ?? {})) {
            if (!value) continue;

            if (config.relations[key]) rels[key] = value === true ? {} : value;
            else if (others.has(key)) foreign.push(key);
        }
    }

    const strip = (obj: Row | undefined) =>
        obj &&
        Object.fromEntries(
            Object.entries(obj).filter(([k]) => !config.relations[k])
        );

    const include = strip(args.include);

    const foreignKeys = Object.keys(rels)
        .filter((k) => config.relations[k].kind === 'one')
        .map((k) => config.relations[k].fk);

    const forced = Object.fromEntries(
        [...extraSelect, 'id', 'sourceId', ...foreignKeys].map((k) => [k, true])
    );

    const select = args.select
        ? { ...strip(args.select), ...forced }
        : undefined;

    const localArgs = {
        ...args,
        include: include && Object.keys(include).length ? include : undefined,
        select,
    };

    const project = (rows: Row[]) =>
        args.select
            ? rows.map((r) =>
                  Object.fromEntries(
                      Object.entries(args.select as Row)
                          .filter(([, v]) => v)
                          .map(([k]) => [k, r[k]])
                  )
              )
            : rows;

    return { rels, foreign, localArgs, project };
}

export const targetArgs = (
    relArgs: Row,
    extra: string[]
): { args: Row; drop: string[] } => {
    if (!relArgs.select) return { args: relArgs, drop: [] };

    const drop = extra.filter((k) => !relArgs.select[k]);

    return {
        args: {
            ...relArgs,
            select: {
                ...relArgs.select,
                ...Object.fromEntries(extra.map((k) => [k, true])),
            },
        },
        drop,
    };
};

export async function resolveRelation(
    ctx: Ctx,
    rows: Row[],
    rel: Relation,
    key: string,
    relArgs: Row,
    campaignId: string
) {
    const target = layeredModels()[rel.target];

    if (rel.kind === 'one') {
        const ids = [
            ...new Set(rows.map((r) => r[rel.fk]).filter(Boolean)),
        ] as string[];

        const { args, drop } = targetArgs(relArgs, ['id']);

        const found: Row[] = ids.length
            ? await ctx.ext[target.local].findMany({
                  ...args,
                  where: { ...args.where, campaignId, id: { in: ids } },
              })
            : [];

        const byId = new Map(found.map((t) => [t.id, t]));

        for (const r of rows) {
            const hit = r[rel.fk] ? byId.get(r[rel.fk]) : undefined;

            r[key] = hit
                ? Object.fromEntries(
                      Object.entries(hit).filter(([k]) => !drop.includes(k))
                  )
                : null;
        }

        return;
    }

    const ids = rows.map((r) => r.id as string);

    const { take, skip, ...rest } = relArgs;

    const { args, drop } = targetArgs(rest, [rel.fk]);

    const found: Row[] = ids.length
        ? await ctx.ext[target.local].findMany({
              ...args,
              where: { ...args.where, campaignId, [rel.fk]: { in: ids } },
          })
        : [];

    const groups = new Map<string, Row[]>();

    for (const t of found)
        groups.set(t[rel.fk], [
            ...(groups.get(t[rel.fk]) ?? []),
            Object.fromEntries(
                Object.entries(t).filter(([k]) => !drop.includes(k))
            ),
        ]);

    for (const r of rows) {
        const list = groups.get(r.id) ?? [];

        r[key] =
            skip || take != null
                ? list.slice(
                      skip ?? 0,
                      take != null ? (skip ?? 0) + take : undefined
                  )
                : list;
    }
}

export async function resolveRelations(
    ctx: Ctx,
    config: LayerConfig,
    rows: Row[],
    rels: Record<string, Row>,
    campaignId: string
) {
    for (const [key, relArgs] of Object.entries(rels))
        await resolveRelation(
            ctx,
            rows,
            config.relations[key],
            key,
            relArgs,
            campaignId
        );
}

/** A base row cannot be edited, so scalar references to a row the DM hid read as null (the former ON DELETE SET NULL). */
export async function nullHiddenRefs(
    ctx: Ctx,
    config: LayerConfig,
    rows: Row[],
    campaignId: string,
    layer: CampaignLayer
) {
    if (!rows.length) return;

    const hiddenOf = new Map<string, Set<string>>();

    for (const { target, fk, kind } of Object.values(config.relations)) {
        if (kind !== 'one') continue;

        if (!hiddenOf.has(target))
            hiddenOf.set(
                target,
                (
                    await overlayOf(
                        ctx,
                        layeredModels()[target],
                        campaignId,
                        layer
                    )
                ).hidden
            );

        const hidden = hiddenOf.get(target)!;

        if (hidden.size)
            for (const r of rows) if (hidden.has(r[fk])) r[fk] = null;
    }
}

/** Layered rows for (model, campaign): local rows win over base rows by id; hidden base ids are dropped. */
export async function layeredFindMany(
    ctx: Ctx,
    config: LayerConfig,
    args: Row,
    runLocal: Query,
    campaignId: string,
    rest: Row,
    layer: CampaignLayer
): Promise<Row[]> {
    const { take, skip, orderBy } = args;

    const plan = planArgs(
        config,
        args,
        orderKeys(orderBy).map(([k]) => k)
    );

    const locals: Row[] = (
        await runLocal({
            ...plan.localArgs,
            where: localWhere(config, rest, campaignId),
            take: undefined,
            skip: undefined,
        })
    ).map(expose);

    const overlay = await overlayOf(ctx, config, campaignId, layer);

    const localIds = new Set(locals.map((r) => r.id));

    const bases = (await baseVisible(ctx, config, layer, rest)).filter(
        (b) =>
            !overlay.hidden.has(b.id) &&
            !overlay.shadowed.has(b.id) &&
            !localIds.has(b.id)
    );

    const fromBase = new Set<Row>();

    const baseShaped = bases.map((b) => {
        const shaped = asLocalShape(b, campaignId);

        fromBase.add(shaped);

        return shaped;
    });

    await nullHiddenRefs(ctx, config, baseShaped, campaignId, layer);

    let merged = sortRows([...locals, ...baseShaped], orderBy);

    if (skip) merged = merged.slice(skip);

    if (take != null) merged = merged.slice(0, take);

    if (plan.foreign.length && merged.some((r) => fromBase.has(r)))
        throw new Error(
            `LAYER_UNSUPPORTED_INCLUDE:${config.model}.${plan.foreign.join(',')}`
        );

    await resolveRelations(ctx, config, merged, plan.rels, campaignId);

    return plan.project(merged);
}

export async function layeredCount(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    rest: Row,
    layer: CampaignLayer
): Promise<number> {
    const locals: Row[] = (
        await local(ctx, config).findMany({
            where: localWhere(config, rest, campaignId),
            select: { id: true, sourceId: true },
        })
    ).map(expose);

    const overlay = await overlayOf(ctx, config, campaignId, layer);

    const localIds = new Set(locals.map((r) => r.id));

    const bases = (await baseVisible(ctx, config, layer, rest)).filter(
        (b) =>
            !overlay.hidden.has(b.id) &&
            !overlay.shadowed.has(b.id) &&
            !localIds.has(b.id)
    );

    return locals.length + bases.length;
}

export const AGGREGATES = ['_count', '_max', '_min', '_sum', '_avg'] as const;

export async function layeredAggregate(
    ctx: Ctx,
    config: LayerConfig,
    args: Row,
    campaignId: string,
    rest: Row,
    layer: CampaignLayer
) {
    const fields = new Set<string>();

    for (const op of AGGREGATES)
        if (args[op] && typeof args[op] === 'object')
            for (const [k, v] of Object.entries(args[op]))
                if (v && k !== '_all') fields.add(k);

    const rows = await layeredFindMany(
        ctx,
        config,
        { select: Object.fromEntries([...fields, 'id'].map((k) => [k, true])) },
        (x) => local(ctx, config).findMany(x),
        campaignId,
        rest,
        layer
    );

    const values = (field: string) =>
        rows.map((r) => r[field]).filter((v) => v != null) as number[];

    const out: Row = {};

    for (const op of AGGREGATES) {
        const spec = args[op];

        if (!spec) continue;

        if (op === '_count' && spec === true) {
            out._count = rows.length;

            continue;
        }

        out[op] = Object.fromEntries(
            Object.entries(spec as Row)
                .filter(([, v]) => v)
                .map(([field]) => {
                    if (op === '_count')
                        return [
                            field,
                            field === '_all'
                                ? rows.length
                                : values(field).length,
                        ];

                    const list = values(field);

                    if (!list.length) return [field, null];

                    if (op === '_max')
                        return [field, list.reduce((a, b) => (b > a ? b : a))];

                    if (op === '_min')
                        return [field, list.reduce((a, b) => (b < a ? b : a))];

                    const sum = list.reduce((a, b) => a + b, 0);

                    return [field, op === '_sum' ? sum : sum / list.length];
                })
        );
    }

    return out;
}

export const notFound = () =>
    new Prisma.PrismaClientKnownRequestError('No record found', {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client,
    });

/** By-id reads without a campaign see stored rows only: a base row belongs to a template version and is never addressed without a campaign. */
export async function readWithoutCampaign(operation: string, args: Row, query: Query) {
    if (!operation.endsWith('OrThrow')) return query(args);

    return query(args).catch((e: unknown) => {
        throw (e as { code?: string })?.code === 'P2025' ? notFound() : e;
    });
}

export async function read(
    ctx: Ctx,
    config: LayerConfig,
    operation: string,
    args: Row,
    query: Query
) {
    const { campaignId, rest } = splitWhere(args.where);

    if (!campaignId) return readWithoutCampaign(operation, args, query);

    const layer = await campaignLayer(ctx, campaignId);

    if (!layer) return query(args);

    assertSupported(config, args, rest);

    if (operation === 'count')
        return layeredCount(ctx, config, campaignId, rest, layer);

    if (operation === 'aggregate')
        return layeredAggregate(ctx, config, args, campaignId, rest, layer);

    const many = operation === 'findMany';

    const rows = await layeredFindMany(
        ctx,
        config,
        many ? args : { ...args, take: 1 },
        many ? query : (x) => local(ctx, config).findMany(x),
        campaignId,
        rest,
        layer
    );

    if (many) return rows;

    if (!rows[0] && operation.endsWith('OrThrow')) throw notFound();

    return rows[0] ?? null;
}
