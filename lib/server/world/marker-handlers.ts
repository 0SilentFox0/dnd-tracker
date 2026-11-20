import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { DEFAULT_ZONE_COLOR, MAX_MARKERS_PER_MAP } from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import {
    createWorldMarkerSchema,
    updateWorldMarkerSchema,
} from '@/lib/schemas/world';
import { ContentError } from '@/lib/server/content/errors';
import { lockWorldMap } from '@/lib/server/world/lock';
import {
    clearShowAfterDelete,
    deleteSubtreeWithFiles,
    ownedMap,
    ownedMarker,
    subtreeTargets,
} from '@/lib/server/world/map-handlers';
import { toWorldMarker } from '@/lib/server/world/map-store';
import { publishWorldChanged } from '@/lib/server/world/world-events';
import { errorResponse } from '@/lib/utils/api/api-response';
import { withDM } from '@/lib/utils/api/as-dm';
import { parseBody } from '@/lib/utils/api/parse-body';
import { polygonCentroid } from '@/lib/utils/world/geometry';

const layerOnMap = async (layerId: string, mapId: string) =>
    (await prisma.worldLayer.findFirst({
        where: { id: layerId, mapId },
        select: { id: true },
    })) !== null;

export function createWorldMarkerHandler(req: Request, campaignId: string) {
    return withDM(campaignId, 'create world marker', async () => {
        const body = await parseBody(createWorldMarkerSchema, req);

        if (body instanceof NextResponse) return body;

        const map = await ownedMap(campaignId, body.mapId);

        if (map instanceof NextResponse) return map;

        if (body.layerId && !(await layerOnMap(body.layerId, body.mapId)))
            return errorResponse(API_ERRORS.WORLD_LAYER_NOT_FOUND, 404);

        const zone = body.kind === 'zone' && body.polygon ? body.polygon : null;

        const { x, y } = zone ? polygonCentroid(zone) : body;

        const created = await prisma.$transaction(async (tx) => {
            await lockWorldMap(tx, body.mapId);

            const { _count, _max } = await tx.worldMarker.aggregate({
                where: { mapId: body.mapId },
                _count: true,
                _max: { sortOrder: true },
            });

            if (_count >= MAX_MARKERS_PER_MAP)
                throw new ContentError(API_ERRORS.WORLD_MARKERS_LIMIT, 409);

            return tx.worldMarker.create({
                data: {
                    mapId: body.mapId,
                    kind: body.kind,
                    x,
                    y,
                    polygon: body.polygon ?? undefined,
                    name: body.name,
                    icon: body.icon ?? null,
                    description: body.description ?? null,
                    color: body.color ?? (zone ? DEFAULT_ZONE_COLOR : null),
                    layerId: body.layerId ?? null,
                    sortOrder: (_max.sortOrder ?? -1) + 1,
                },
            });
        });

        publishWorldChanged(campaignId, body.mapId);

        return NextResponse.json(toWorldMarker(created), { status: 201 });
    });
}

export function updateWorldMarkerHandler(
    req: Request,
    campaignId: string,
    markerId: string
) {
    return withDM(campaignId, 'update world marker', async () => {
        const owned = await ownedMarker(campaignId, markerId);

        if (owned instanceof NextResponse) return owned;

        const body = await parseBody(updateWorldMarkerSchema, req);

        if (body instanceof NextResponse) return body;

        if (body.layerId && !(await layerOnMap(body.layerId, owned.mapId)))
            return errorResponse(API_ERRORS.WORLD_LAYER_NOT_FOUND, 404);

        const { x, y, polygon, layerId, ...rest } = body;

        const data: Prisma.WorldMarkerUpdateInput = { ...rest };

        if (layerId !== undefined)
            data.layer = layerId
                ? { connect: { id: layerId } }
                : { disconnect: true };

        if (owned.kind === 'zone') {
            if (polygon === null)
                return errorResponse(API_ERRORS.WORLD_POLYGON_INVALID, 400);

            if (polygon)
                Object.assign(data, { polygon }, polygonCentroid(polygon));
        } else if (polygon !== undefined) {
            return errorResponse(API_ERRORS.WORLD_POLYGON_INVALID, 400);
        } else {
            data.x = x;
            data.y = y;
        }

        const updated = await prisma.worldMarker.update({
            where: { id: markerId },
            data,
            include: { childMap: { select: { id: true } } },
        });

        publishWorldChanged(campaignId, owned.mapId);

        return NextResponse.json(toWorldMarker(updated));
    });
}

export function deleteWorldMarkerHandler(campaignId: string, markerId: string) {
    return withDM(campaignId, 'delete world marker', async () => {
        const owned = await ownedMarker(campaignId, markerId);

        if (owned instanceof NextResponse) return owned;

        const remove = () =>
            prisma.worldMarker.delete({ where: { id: markerId } });

        const child = owned.childMap
            ? await subtreeTargets(campaignId, owned.childMap.id)
            : { mapIds: [], markerIds: [] };

        if (owned.childMap)
            await deleteSubtreeWithFiles(campaignId, owned.childMap.id, remove);
        else await remove();

        clearShowAfterDelete(campaignId, {
            mapIds: child.mapIds,
            markerIds: [markerId, ...child.markerIds],
        });
        publishWorldChanged(campaignId, owned.mapId);

        return NextResponse.json({ ok: true });
    });
}
