import { after,NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import {
    createWorldLayerSchema,
    deleteWorldLayerQuerySchema,
    setLayerHeroesSchema,
    updateWorldLayerSchema,
} from '@/lib/schemas/world';
import {
    createLayer,
    isMissingRecord,
    listDmLayers,
    toWorldLayer,
    WorldLayerError,
} from '@/lib/server/world/layer-store';
import {
    clearShowAfterDelete,
    ownedMap,
} from '@/lib/server/world/map-handlers';
import { worldImageInUse } from '@/lib/server/world/map-store';
import { publishWorldChanged } from '@/lib/server/world/world-events';
import {
    ownedWorldMapPath,
    removeWorldMapFiles,
} from '@/lib/supabase/world-map-storage';
import { errorResponse } from '@/lib/utils/api/api-response';
import { withDM } from '@/lib/utils/api/as-dm';
import { loadOwned } from '@/lib/utils/api/load-owned';
import { parseBody } from '@/lib/utils/api/parse-body';

const withHeroes = { heroes: { select: { characterId: true } } } as const;

function removeUnusedImage(campaignId: string, url: string | null) {
    if (!url) return;

    after(async () => {
        if (!(await worldImageInUse(campaignId, url)))
            await removeWorldMapFiles(campaignId, [url]);
    });
}

const ownedLayer = (campaignId: string, layerId: string) =>
    loadOwned(
        prisma.worldLayer
            .findUnique({
                where: { id: layerId },
                include: { map: { select: { campaignId: true } } },
            })
            .then((l) => l && { ...l, campaignId: l.map.campaignId }),
        campaignId,
        API_ERRORS.WORLD_LAYER_NOT_FOUND
    );

export function layersListHandler(campaignId: string, mapId: string) {
    return withDM(campaignId, 'list world layers', async () => {
        const map = await ownedMap(campaignId, mapId);

        if (map instanceof NextResponse) return map;

        return NextResponse.json(await listDmLayers(mapId));
    });
}

export function layerCreateHandler(
    req: Request,
    campaignId: string,
    mapId: string
) {
    return withDM(campaignId, 'create world layer', async () => {
        const body = await parseBody(createWorldLayerSchema, req);

        if (body instanceof NextResponse) return body;

        const map = await ownedMap(campaignId, mapId);

        if (map instanceof NextResponse) return map;

        try {
            const created = await createLayer(mapId, { ...body, mapId });

            publishWorldChanged(campaignId, mapId);

            return NextResponse.json(created, { status: 201 });
        } catch (e) {
            if (e instanceof WorldLayerError) return errorResponse(e.code, 409);

            throw e;
        }
    });
}

export function layerPatchHandler(
    req: Request,
    campaignId: string,
    layerId: string
) {
    return withDM(campaignId, 'update world layer', async () => {
        const body = await parseBody(updateWorldLayerSchema, req);

        if (body instanceof NextResponse) return body;

        const layer = await ownedLayer(campaignId, layerId);

        if (layer instanceof NextResponse) return layer;

        if (body.imageUrl && !ownedWorldMapPath(campaignId, body.imageUrl))
            return errorResponse(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

        const { rect, ...rest } = body;

        const data: Prisma.WorldLayerUpdateInput = {
            ...rest,
            ...(rect && {
                imgX: rect.x,
                imgY: rect.y,
                imgW: rect.w,
                imgH: rect.h,
            }),
        };

        const updated = await prisma.worldLayer.update({
            where: { id: layerId },
            data,
            include: withHeroes,
        });

        if (body.imageUrl !== undefined && body.imageUrl !== layer.imageUrl)
            removeUnusedImage(campaignId, layer.imageUrl);

        publishWorldChanged(campaignId, layer.mapId);

        return NextResponse.json(toWorldLayer(updated));
    });
}

export function layerHeroesHandler(
    req: Request,
    campaignId: string,
    layerId: string
) {
    return withDM(campaignId, 'set world layer heroes', async () => {
        const body = await parseBody(setLayerHeroesSchema, req);

        if (body instanceof NextResponse) return body;

        const layer = await ownedLayer(campaignId, layerId);

        if (layer instanceof NextResponse) return layer;

        const heroIds = [...new Set(body.heroIds)];

        const known = await prisma.character.count({
            where: { id: { in: heroIds }, campaignId },
        });

        if (known !== heroIds.length)
            return errorResponse(API_ERRORS.WORLD_LAYER_INVALID, 400);

        const updated = await prisma.$transaction(async (tx) => {
            await tx.worldLayerHero.deleteMany({ where: { layerId } });
            await tx.worldLayerHero.createMany({
                data: heroIds.map((characterId) => ({ layerId, characterId })),
            });

            return tx.worldLayer.findUniqueOrThrow({
                where: { id: layerId },
                include: withHeroes,
            });
        });

        publishWorldChanged(campaignId, layer.mapId);

        return NextResponse.json(toWorldLayer(updated));
    });
}

export function layerDeleteHandler(
    req: Request,
    campaignId: string,
    layerId: string
) {
    return withDM(campaignId, 'delete world layer', async () => {
        const query = deleteWorldLayerQuerySchema.safeParse({
            markers: new URL(req.url).searchParams.get('markers') ?? undefined,
        });

        if (!query.success) return errorResponse(API_ERRORS.INVALID_BODY, 400);

        const mode = query.data.markers;

        const layer = await ownedLayer(campaignId, layerId);

        if (layer instanceof NextResponse) return layer;

        const markers = await prisma.worldMarker.findMany({
            where: { layerId },
            select: { id: true, childMap: { select: { id: true } } },
        });

        if (
            markers.length > 0 &&
            (!mode ||
                // nested maps need the subtree cleanup path, so no bulk delete
                (mode === 'delete' && markers.some((m) => m.childMap)))
        )
            return errorResponse(API_ERRORS.WORLD_LAYER_HAS_MARKERS, 409);

        try {
            await prisma.$transaction(async (tx) => {
                if (markers.length > 0) {
                    if (mode === 'ungroup')
                        await tx.worldMarker.updateMany({
                            where: { layerId },
                            data: { layerId: null },
                        });
                    else
                        await tx.worldMarker.deleteMany({ where: { layerId } });
                }

                await tx.worldLayer.delete({ where: { id: layerId } });
            });
        } catch (e) {
            if (isMissingRecord(e))
                return errorResponse(API_ERRORS.WORLD_LAYER_NOT_FOUND, 404);

            throw e;
        }

        removeUnusedImage(campaignId, layer.imageUrl);

        if (mode === 'delete' && markers.length > 0)
            clearShowAfterDelete(campaignId, {
                mapIds: [],
                markerIds: markers.map((m) => m.id),
            });

        publishWorldChanged(campaignId, layer.mapId);

        return NextResponse.json({ ok: true });
    });
}
