import {
    createPublicWorldNoteSchema,
    updatePublicWorldNoteSchema,
} from './inputs';
import { requireOwnedMarker } from './prepare';
import { noteRef, WriteArgs, WriteResult } from './writers-maps';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import { noteInclude, toNote } from '@/lib/server/world/note-store';

export async function writeNotesCreate({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const body = createPublicWorldNoteSchema.parse(input);

    const marker = await requireOwnedMarker(campaignId, body.markerId);

    const row = await prisma.worldNote.create({
        data: {
            markerId: marker.id,
            authorUserId: ctx.caller.actor.userId,
            characterId: null,
            visibility: 'public',
            text: body.text,
        },
        include: noteInclude,
    });

    emitWorldChanged(marker.mapId);

    return {
        data: toNote(row, ctx.caller.actor.userId),
        affected: [noteRef(row.id)],
    };
}

export async function writeNotesUpdate({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.noteId);

    const body = updatePublicWorldNoteSchema.parse(input.patch);

    const row = await prisma.worldNote.findFirst({
        where: { id, marker: { map: { campaignId } } },
        include: { ...noteInclude, marker: true },
    });

    if (!row || row.authorUserId !== ctx.caller.actor.userId)
        throw new ContentError(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

    const updated = await prisma.worldNote.update({
        where: { id },
        data: body,
        include: noteInclude,
    });

    emitWorldChanged(row.marker.mapId);

    return {
        data: toNote(updated, ctx.caller.actor.userId),
        affected: [noteRef(id)],
    };
}

export async function writeNotesDelete({
    ctx,
    campaignId,
    input,
    emitWorldChanged,
}: WriteArgs): Promise<WriteResult> {
    const id = String(input.noteId);

    const row = await prisma.worldNote.findFirst({
        where: { id, marker: { map: { campaignId } } },
        include: { marker: true },
    });

    if (
        !row ||
        (row.visibility === 'private' &&
            row.authorUserId !== ctx.caller.actor.userId)
    )
        throw new ContentError(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404);

    if (
        row.visibility !== 'public' &&
        row.authorUserId !== ctx.caller.actor.userId
    )
        throw new ContentError(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

    await prisma.worldNote.delete({ where: { id } });

    if (row.visibility === 'public') emitWorldChanged(row.marker.mapId);

    return { data: { ok: true }, affected: [noteRef(id)] };
}
