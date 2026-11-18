import {
    findMap,
    mapNotFound,
    markerNotFound,
    StateArgs,
    subtreeState,
} from './state-common';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import { noteInclude } from '@/lib/server/world/note-store';

export async function mapsCreateState({ campaignId, input }: StateArgs) {
    const [maps, parent] = await Promise.all([
        prisma.worldMap.findMany({
            where: { campaignId },
            select: { id: true, parentMarkerId: true },
        }),
        input.parentMarkerId
            ? prisma.worldMarker.findFirst({
                  where: {
                      id: String(input.parentMarkerId),
                      map: { campaignId },
                  },
                  include: { childMap: { select: { id: true } } },
              })
            : null,
    ]);

    return {
        mapCount: maps.length,
        rootExists: maps.some((map) => map.parentMarkerId === null),
        parent: parent
            ? { id: parent.id, childMapId: parent.childMap?.id ?? null }
            : null,
    };
}

export async function mapsUpdateState({ campaignId, input }: StateArgs) {
    const row = await findMap(campaignId, input.mapId);

    if (!row) throw mapNotFound();

    return row;
}

export async function mapsDeleteState({ campaignId, input }: StateArgs) {
    const row = await findMap(campaignId, input.mapId);

    if (!row) throw mapNotFound();

    return { row, ...(await subtreeState(campaignId, row.id)) };
}

export async function markersCreateState({ campaignId, input }: StateArgs) {
    const row = await prisma.worldMap.findFirst({
        where: { id: String(input.mapId), campaignId },
        select: { id: true, markers: { select: { sortOrder: true } } },
    });

    if (!row) throw mapNotFound();

    return {
        mapId: row.id,
        markerCount: row.markers.length,
        maxSortOrder: Math.max(
            -1,
            ...row.markers.map((marker) => marker.sortOrder)
        ),
    };
}

export async function markerMutationState({
    campaignId,
    input,
    operation,
}: StateArgs) {
    const row = await prisma.worldMarker.findFirst({
        where: { id: String(input.markerId), map: { campaignId } },
        include: { map: true, childMap: { select: { id: true } } },
    });

    if (!row) throw markerNotFound();

    if (operation === 'markers.delete' && row.childMap)
        return { row, ...(await subtreeState(campaignId, row.childMap.id)) };

    return row;
}

export async function notesCreateState({ campaignId, input }: StateArgs) {
    const marker = await prisma.worldMarker.findFirst({
        where: { id: String(input.markerId), map: { campaignId } },
    });

    if (!marker) throw markerNotFound();

    return marker;
}

export async function noteMutationState({
    caller,
    campaignId,
    input,
    operation,
}: StateArgs) {
    const note = await prisma.worldNote.findFirst({
        where: {
            id: String(input.noteId),
            marker: { map: { campaignId } },
        },
        include: { ...noteInclude, marker: { include: { map: true } } },
    });

    if (
        !note ||
        (note.visibility === 'private' &&
            note.authorUserId !== caller.actor.userId)
    )
        throw new ContentError(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404);

    if (
        operation === 'notes.update' &&
        note.authorUserId !== caller.actor.userId
    )
        throw new ContentError(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

    return note;
}
