import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { requireOwnedMap } from './prepare';
import { markerNotFound, TargetsState } from './state-common';
import { markerRef, WriteArgs, WriteResult } from './writers-maps';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { DEFAULT_ZONE_COLOR, MAX_MARKERS_PER_MAP } from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import {
    createWorldMarkerSchema,
    updateWorldMarkerSchema,
} from '@/lib/schemas/world';
import { ContentError } from '@/lib/server/content/errors';
import { lockWorldMap } from '@/lib/server/world/lock';
import { toWorldMarker } from '@/lib/server/world/map-store';
import { jsonContent } from '@/lib/utils/common/json';
import { polygonCentroid } from '@/lib/utils/world/geometry';

export async function writeMarkersCreate({
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = createWorldMarkerSchema.parse(input);

    await requireOwnedMap(campaignId, body.mapId);

    const zone = body.kind === 'zone' && body.polygon ? body.polygon : null;

    const point = zone ? polygonCentroid(zone) : body;

    const row = await prisma.$transaction(async (tx) => {
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
                ...point,
                polygon: body.polygon ?? undefined,
                name: body.name,
                icon: body.icon ?? null,
                color: body.color ?? (zone ? DEFAULT_ZONE_COLOR : null),
                sortOrder: (_max.sortOrder ?? -1) + 1,
            },
        });
    });

    emitWorldChanged(body.mapId);

    return { data: toWorldMarker(row), affected: [markerRef(row)] };
}

function markerUpdateData(
    owned: { kind: string },
    body: z.infer<typeof updateWorldMarkerSchema>
): Prisma.WorldMarkerUpdateInput {
    const { x, y, polygon, ...rest } = body;

    const update: Prisma.WorldMarkerUpdateInput = { ...rest };

    if (owned.kind === 'zone') {
        if (polygon === null)
            throw new ContentError(API_ERRORS.WORLD_POLYGON_INVALID, 400);

        if (polygon)
            Object.assign(update, { polygon, ...polygonCentroid(polygon) });
    } else if (polygon !== undefined)
        throw new ContentError(API_ERRORS.WORLD_POLYGON_INVALID, 400);
    else {
        if (x !== undefined) update.x = x;

        if (y !== undefined) update.y = y;
    }

    return update;
}

export async function writeMarkersUpdate({
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.markerId);

    const body = updateWorldMarkerSchema.parse(input.patch);

    const owned = await prisma.worldMarker.findFirst({
        where: { id, map: { campaignId } },
    });

    if (!owned) throw markerNotFound();

    const row = await prisma.worldMarker.update({
        where: { id },
        data: markerUpdateData(owned, body),
        include: { childMap: { select: { id: true } } },
    });

    emitWorldChanged(owned.mapId);

    return {
        data: toWorldMarker(row),
        affected: [markerRef({ id, name: row.name })],
    };
}

export async function writeMarkersDelete({
    ctx,
    campaignId,
    input,
    before,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.markerId);

    const marker = await prisma.worldMarker.findFirst({
        where: { id, map: { campaignId } },
        include: { childMap: { select: { id: true } } },
    });

    if (!marker) throw markerNotFound();

    const oldState = before as Partial<TargetsState>;

    const gone = oldState.targets ?? { mapIds: [], markerIds: [] };

    await prisma.worldMarker.delete({ where: { id } });
    ctx.afterCommit({
        key: `world-delete:${ctx.intentId}`,
        kind: 'world-delete',
        payload: jsonContent({
            campaignId,
            mapIds: gone.mapIds,
            markerIds: [id, ...gone.markerIds],
            files: oldState.files ?? [],
        }),
    });
    emitWorldChanged(marker.mapId);

    return { data: { ok: true }, affected: [markerRef(marker)] };
}
