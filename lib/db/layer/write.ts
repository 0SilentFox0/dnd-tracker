import { type CampaignLayer } from '@/lib/db/layer/cache';
import { type LayerConfig } from '@/lib/db/layer/config';
import { baseVisible, planArgs, resolveRelations } from '@/lib/db/layer/read';
import { asLocalShape, assertSupported, campaignLayer, type Ctx, expose, local, localByPublicId, localWhere, overlayOf, type Query, type Row, splitWhere, touch, UNSUPPORTED_OPS } from '@/lib/db/layer/shared';
import { currentContentWrite } from '@/lib/server/content/write-context';
import { contentRowHash } from '@/lib/utils/content/row-hash';

/** Public ids among `ids` that already have a local row (an override, or an ordinary row carrying that id). */
export async function localIdsAmong(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    ids: string[]
): Promise<Set<string>> {
    if (!ids.length) return new Set();

    const rows: Array<{ id: string; sourceId: string | null }> = await local(
        ctx,
        config
    ).findMany({
        where: {
            campaignId,
            OR: [{ sourceId: { in: ids } }, { id: { in: ids } }],
        },
        select: { id: true, sourceId: true },
    });

    return new Set(rows.map((r) => r.sourceId ?? r.id));
}

export async function materialize(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    layer: CampaignLayer,
    where: Row
) {
    const overlay = await overlayOf(ctx, config, campaignId, layer);

    const candidates = (await baseVisible(ctx, config, layer, where)).filter(
        (b) => !overlay.hidden.has(b.id)
    );

    const taken = await localIdsAmong(
        ctx,
        config,
        campaignId,
        candidates.map((b) => b.id)
    );

    const bases = candidates.filter((b) => !taken.has(b.id));

    if (!bases.length) return;

    await local(ctx, config).createMany({
        data: bases.map((b) => {
            const { id: _id, ...shaped } = asLocalShape(b, campaignId);

            return {
                ...shaped,
                sourceHash: contentRowHash(
                    config.model,
                    Object.fromEntries(
                        config.hashColumns
                            .filter((c) => c in b)
                            .map((c) => [c, b[c]])
                    )
                ),
            };
        }),
    });

    touch(campaignId);
}

export async function hideBase(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    ids: string[]
) {
    if (!ids.length) return;

    await ctx.raw.campaignContentHide.createMany({
        data: ids.map((id) => ({ campaignId, table: config.hideTable, id })),
        skipDuplicates: true,
    });

    touch(campaignId);
}

export async function removeMany(
    ctx: Ctx,
    config: LayerConfig,
    campaignId: string,
    layer: CampaignLayer,
    where: Row,
    args: Row,
    query: Query
) {
    const overlay = await overlayOf(ctx, config, campaignId, layer);

    const matchingLocals: Array<{ id: string; sourceId: string | null }> =
        await local(ctx, config).findMany({
            where: localWhere(config, where, campaignId),
            select: { id: true, sourceId: true },
        });

    const candidates = (await baseVisible(ctx, config, layer, where)).filter(
        (b) => !overlay.hidden.has(b.id)
    );

    const shadowed = await localIdsAmong(
        ctx,
        config,
        campaignId,
        candidates.map((b) => b.id)
    );

    const baseOnly = candidates
        .filter((b) => !shadowed.has(b.id))
        .map((b) => b.id);

    const overridden = matchingLocals.flatMap((r) =>
        r.sourceId ? [r.sourceId] : []
    );

    await hideBase(ctx, config, campaignId, [
        ...new Set([...baseOnly, ...overridden]),
    ]);

    const result = (await query({
        ...args,
        where: localWhere(config, where, campaignId),
    })) as { count: number };

    return { count: result.count + baseOnly.length };
}

export async function withRelations(
    ctx: Ctx,
    config: LayerConfig,
    args: Row,
    campaignId: string,
    query: Query
) {
    const plan = planArgs(config, args);

    const found = await query({
        ...args,
        include: plan.localArgs.include,
        select: plan.localArgs.select,
    });

    if (!found) return found;

    const row = expose(found);

    await resolveRelations(ctx, config, [row], plan.rels, campaignId);

    return plan.project([row])[0];
}

export async function onWrite(
    ctx: Ctx,
    config: LayerConfig,
    operation: string,
    args: Row,
    query: Query
) {
    const { campaignId: whereCampaign, rest } = splitWhere(args.where);

    const campaignId = whereCampaign ?? currentContentWrite()?.campaignId;

    if (!campaignId) return query(args);

    const layer = await campaignLayer(ctx, campaignId);

    if (!layer) return query(args);

    assertSupported(config, args, rest);

    if (operation === 'deleteMany')
        return removeMany(ctx, config, campaignId, layer, rest, args, query);

    if (operation === 'delete') {
        const [base] = await baseVisible(ctx, config, layer, { id: rest.id });

        if (base) await hideBase(ctx, config, campaignId, [base.id]);

        const localRow = await localByPublicId(
            ctx,
            config,
            campaignId,
            rest.id as string
        );

        if (localRow)
            return withRelations(
                ctx,
                config,
                { ...args, where: { ...args.where, id: localRow.id } },
                campaignId,
                query
            );

        if (base) {
            const shaped = asLocalShape(base, campaignId);

            await resolveRelations(
                ctx,
                config,
                [shaped],
                planArgs(config, args).rels,
                campaignId
            );

            return shaped;
        }

        return query(args);
    }

    await materialize(ctx, config, campaignId, layer, rest);

    if (operation === 'updateMany')
        return query({ ...args, where: localWhere(config, rest, campaignId) });

    const target =
        typeof rest.id === 'string'
            ? await localByPublicId(ctx, config, campaignId, rest.id)
            : null;

    return withRelations(
        ctx,
        config,
        target ? { ...args, where: { ...args.where, id: target.id } } : args,
        campaignId,
        query
    );
}

export const stringOf = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** The campaign a create/createMany writes for: always taken from the data, never from the ambient write context. */
export function createdFor(args: Row): string | undefined {
    const rows: Row[] = Array.isArray(args.data) ? args.data : [args.data];

    const found = new Set(
        rows.map(
            (d) => stringOf(d?.campaignId) ?? stringOf(d?.campaign?.connect?.id)
        )
    );

    if (found.size > 1) throw new Error('LAYER_MIXED_CAMPAIGNS');

    return [...found][0];
}

export async function onOther(
    ctx: Ctx,
    config: LayerConfig,
    operation: string,
    args: Row,
    query: Query
) {
    const creating = operation === 'create' || operation === 'createMany';

    const campaignId = creating
        ? createdFor(args)
        : (stringOf(args.data?.campaignId) ??
          stringOf(args.where?.campaignId) ??
          stringOf(args.create?.campaignId) ??
          currentContentWrite()?.campaignId);

    const layer = campaignId ? await campaignLayer(ctx, campaignId) : null;

    if (!campaignId || !layer) return query(args);

    if (UNSUPPORTED_OPS.has(operation))
        throw new Error(
            `LAYER_UNSUPPORTED_OPERATION:${config.model}.${operation}`
        );

    if (creating) {
        const given = (
            operation === 'create'
                ? [args.data]
                : Array.isArray(args.data)
                  ? args.data
                  : [args.data]
        ).flatMap((d: Row) => (typeof d?.id === 'string' ? [d.id] : []));

        if (
            given.length &&
            (await baseVisible(ctx, config, layer, { id: { in: given } }))
                .length
        )
            throw new Error(`LAYER_ID_COLLISION:${config.model}`);

        touch(campaignId);

        return operation === 'create'
            ? withRelations(ctx, config, args, campaignId, query)
            : query(args);
    }

    return query(args);
}
