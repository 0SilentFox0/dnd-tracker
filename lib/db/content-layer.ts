import { Prisma, type PrismaClient } from '@prisma/client';

import { invalidateCampaignLayer, layerStats } from '@/lib/db/layer/cache';
import { campaignRelations, isLayered, layeredModels } from '@/lib/db/layer/config';
import { read } from '@/lib/db/layer/read';
import { bypass, bypassLayer, CAMPAIGN_WRITES, campaignLayer, type Ctx, forgetScoped, type Query, type Raw, READS, type Row, txOrWrite, WRITES } from '@/lib/db/layer/shared';
import { onOther, onWrite } from '@/lib/db/layer/write';
import { afterContentCommit } from '@/lib/server/content/write-context';

export { bypassLayer, invalidateCampaignLayer, layerStats };

/** `campaign.spells`, `campaign.races`, ... must see base rows: resolved through the layer instead of the native join. */
async function readCampaign(
    ctx: Ctx,
    operation: string,
    args: Row,
    query: Query
) {
    const hosts = campaignRelations();

    const rels: Record<string, Row> = {};

    for (const source of [args.include, args.select] as Array<Row | undefined>)
        for (const [key, value] of Object.entries(source ?? {}))
            if (value && hosts[key]) rels[key] = value === true ? {} : value;

    if (!Object.keys(rels).length) return query(args);

    const id = typeof args.where?.id === 'string' ? args.where.id : undefined;

    if (id && !(await campaignLayer(ctx, id))) return query(args);

    const strip = (obj: Row | undefined) =>
        obj &&
        Object.fromEntries(Object.entries(obj).filter(([k]) => !hosts[k]));

    const include = strip(args.include);

    const select = args.select
        ? { ...strip(args.select), id: true }
        : undefined;

    const found = await query({
        ...args,
        include: include && Object.keys(include).length ? include : undefined,
        select,
    });

    const rows: Row[] = Array.isArray(found) ? found : found ? [found] : [];

    for (const row of rows) {
        for (const [key, relArgs] of Object.entries(rels))
            row[key] = await ctx.ext[hosts[key].local].findMany({
                ...relArgs,
                where: { ...relArgs.where, campaignId: row.id },
            });
    }

    if (!args.select) return found;

    const project = (r: Row) =>
        Object.fromEntries(
            Object.entries(args.select as Row)
                .filter(([, v]) => v)
                .map(([k]) => [k, r[k]])
        );

    return Array.isArray(found)
        ? rows.map(project)
        : found
          ? project(found)
          : found;
}

export function contentLayer() {
    return Prisma.defineExtension((client) => {
        const raw = client as unknown as Raw;

        let extended: Raw = raw;

        const ctx: Ctx = {
            get raw() {
                return txOrWrite() ?? raw;
            },
            get ext() {
                return txOrWrite() ?? extended;
            },
        };

        const result = client.$extends({
            name: 'content-layer',
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        const run = query as Query;

                        const a = args as Row;

                        if (model === 'Campaign') {
                            if (
                                READS.has(operation) &&
                                operation.startsWith('find')
                            )
                                return readCampaign(ctx, operation, a, run);

                            if (!CAMPAIGN_WRITES.has(operation)) return run(a);

                            if (
                                operation === 'create' ||
                                operation === 'createMany'
                            )
                                return run(a);

                            const value = await run(a);

                            const id = (a.where as Row | undefined)?.id;

                            invalidateCampaignLayer(
                                typeof id === 'string' ? id : undefined
                            );

                            forgetScoped(
                                typeof id === 'string' ? id : undefined
                            );

                            afterContentCommit(() =>
                                invalidateCampaignLayer(
                                    typeof id === 'string' ? id : undefined
                                )
                            );

                            return value;
                        }

                        if (!isLayered(model) || bypass.getStore())
                            return run(a);

                        const config = layeredModels()[model];

                        if (WRITES.has(operation))
                            return onWrite(ctx, config, operation, a, run);

                        if (READS.has(operation))
                            return read(ctx, config, operation, a, run);

                        return onOther(ctx, config, operation, a, run);
                    },
                },
            },
        });

        extended = result as unknown as Raw;

        return result;
    });
}

export type ContentLayerClient = PrismaClient;