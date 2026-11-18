import { z } from 'zod';

import type { ActionExecutionContext, TargetRef } from '../../types';
import { requireOwnedMap, requireOwnedMarker } from './prepare';
import { TargetsState } from './state-common';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_WORLD_MAPS } from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import { createWorldMapSchema } from '@/lib/schemas/world';
import { ContentError } from '@/lib/server/content/errors';
import { toWorldMap } from '@/lib/server/world/map-store';
import { ownedWorldMapPath } from '@/lib/supabase/world-map-storage';
import { jsonContent } from '@/lib/utils/common/json';

export type WriteArgs = {
    ctx: ActionExecutionContext;
    campaignId: string;
    input: Record<string, unknown>;
    before: unknown;
    emitWorldChanged: (mapId: string | null) => void;
};

export type WriteResult = { data: unknown; affected: TargetRef[] };

const mapRef = (row: { id: string; name: string }): TargetRef => ({
    domain: 'world-map',
    id: row.id,
    name: row.name,
});

export const markerRef = (row: { id: string; name: string }): TargetRef => ({
    domain: 'world-marker',
    id: row.id,
    name: row.name,
});

export const noteRef = (id: string): TargetRef => ({
    domain: 'world-note',
    id,
    name: 'World note',
});

async function assertCanCreateMap(
    campaignId: string,
    body: z.infer<typeof createWorldMapSchema>
) {
    if (!ownedWorldMapPath(campaignId, body.imageUrl))
        throw new ContentError(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

    if (
        (await prisma.worldMap.count({ where: { campaignId } })) >=
        MAX_WORLD_MAPS
    )
        throw new ContentError(API_ERRORS.WORLD_MAPS_LIMIT, 409);

    if (body.parentMarkerId) {
        const parent = await requireOwnedMarker(
            campaignId,
            body.parentMarkerId
        );

        if (!parent || parent.childMap)
            throw new ContentError(API_ERRORS.WORLD_NESTED_EXISTS, 409);
    } else if (
        await prisma.worldMap.findFirst({
            where: { campaignId, parentMarkerId: null },
            select: { id: true },
        })
    )
        throw new ContentError(API_ERRORS.WORLD_ROOT_EXISTS, 409);
}

export async function writeMapsCreate({
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = createWorldMapSchema.parse(input);

    await assertCanCreateMap(campaignId, body);

    const row = await prisma.worldMap.create({
        data: {
            campaignId,
            name: body.name,
            imageUrl: body.imageUrl,
            width: body.width,
            height: body.height,
            parentMarkerId: body.parentMarkerId ?? null,
        },
        include: { parentMarker: { select: { mapId: true } } },
    });

    emitWorldChanged(row.id);

    return { data: toWorldMap(row), affected: [mapRef(row)] };
}

export async function writeMapsUpdate({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = input.patch as Record<string, unknown>;

    const old = await requireOwnedMap(campaignId, String(input.mapId));

    const newImage =
        body.imageUrl !== undefined && body.imageUrl !== old.imageUrl
            ? String(body.imageUrl)
            : null;

    if (newImage && !ownedWorldMapPath(campaignId, newImage))
        throw new ContentError(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

    const row = await prisma.worldMap.update({
        where: { id: old.id },
        data: body,
        include: { parentMarker: { select: { mapId: true } } },
    });

    if (
        newImage &&
        (await prisma.worldMap.count({
            where: { campaignId, imageUrl: old.imageUrl },
        })) === 0
    )
        ctx.afterCommit({
            key: `world-file:${ctx.intentId}`,
            kind: 'media-cleanup',
            payload: jsonContent({ campaignId, worldMapUrls: [old.imageUrl] }),
        });

    emitWorldChanged(row.id);

    return { data: toWorldMap(row), affected: [mapRef(row)] };
}

export async function writeMapsDelete({
    ctx,
    campaignId,
    input,
    before,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.mapId);

    const {
        targets: gone,
        files,
        row: old,
    } = before as TargetsState & { row: { name: string } };

    await prisma.worldMap.delete({ where: { id } });
    ctx.afterCommit({
        key: `world-delete:${ctx.intentId}`,
        kind: 'world-delete',
        payload: jsonContent({ campaignId, ...gone, files }),
    });
    emitWorldChanged(null);

    return {
        data: { ok: true, removed: gone.mapIds.length },
        affected: [mapRef({ id, name: old.name })],
    };
}
