import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createWorldNoteSchema, updateWorldNoteSchema } from "@/lib/schemas/world";
import { ownedMarker } from "@/lib/server/world/map-handlers";
import { readWorldMapDetail } from "@/lib/server/world/map-store";
import { activePlayerHeroes } from "@/lib/server/world/travel-store";
import { readViewerScope } from "@/lib/server/world/view-handlers";
import { type CampaignAccessResult, requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { visibleMarkerIds } from "@/lib/utils/world/player-view";
import type { WorldNote } from "@/types/world";

type NoteWithAuthor = { id: string; markerId: string; authorUserId: string; characterId: string | null; visibility: string; text: string; createdAt: Date; updatedAt: Date; author: { displayName: string } };

const include = { author: { select: { displayName: true } } } as const;

const toNote = (n: NoteWithAuthor, userId: string): WorldNote => ({
  id: n.id,
  markerId: n.markerId,
  authorUserId: n.authorUserId,
  authorName: n.author.displayName,
  characterId: n.characterId,
  visibility: n.visibility === "private" ? "private" : "public",
  text: n.text,
  mine: n.authorUserId === userId,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});

async function withAccess(campaignId: string, action: string, run: (access: CampaignAccessResult) => Promise<NextResponse>) {
  try {
    const access = await requireCampaignAccess(campaignId);

    return access instanceof NextResponse ? access : await run(access);
  } catch (error) {
    return handleApiError(error, { action });
  }
}

const forbidden = () => errorResponse(API_ERRORS.WORLD_NOTE_FORBIDDEN, 403);

async function markerVisibleToPlayer(campaignId: string, marker: { id: string; mapId: string }, heroIds: string[], userId: string): Promise<boolean> {
  const { reveals, allowed } = await readViewerScope(campaignId, heroIds);

  if (!allowed.has(marker.mapId)) return false;

  const detail = await readWorldMapDetail(marker.mapId);

  if (!detail) return false;

  return visibleMarkerIds({ map: detail.map, markers: detail.markers, reveals, viewer: { userId, heroIds } }).has(marker.id);
}

export function createNoteHandler(req: Request, campaignId: string) {
  return withAccess(campaignId, "create world note", async (access) => {
    const body = await parseBody(createWorldNoteSchema, req);

    if (body instanceof NextResponse) return body;

    const marker = await ownedMarker(campaignId, body.markerId);

    if (marker instanceof NextResponse) return marker;

    let characterId: string | null = null;

    if (access.isDM) {
      if (body.visibility !== "public") return forbidden();
    } else {
      const heroIds = (await activePlayerHeroes(campaignId, { controlledBy: access.userId })).map((h) => h.id);

      if (body.characterId && !heroIds.includes(body.characterId)) return forbidden();

      if (!(await markerVisibleToPlayer(campaignId, marker, heroIds, access.userId))) return forbidden();

      characterId = body.characterId ?? null;
    }

    const created = await prisma.worldNote.create({ data: { markerId: marker.id, authorUserId: access.userId, characterId, visibility: body.visibility, text: body.text }, include });

    return NextResponse.json(toNote(created, access.userId), { status: 201 });
  });
}

async function ownedNote(campaignId: string, noteId: string) {
  const note = await prisma.worldNote.findUnique({ where: { id: noteId }, include: { ...include, marker: { select: { map: { select: { campaignId: true } } } } } });

  return note && note.marker.map.campaignId === campaignId ? note : errorResponse(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404);
}

export function updateNoteHandler(req: Request, campaignId: string, noteId: string) {
  return withAccess(campaignId, "update world note", async (access) => {
    const note = await ownedNote(campaignId, noteId);

    if (note instanceof NextResponse) return note;

    if (note.authorUserId !== access.userId) return note.visibility === "private" ? errorResponse(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404) : forbidden();

    const body = await parseBody(updateWorldNoteSchema, req);

    if (body instanceof NextResponse) return body;

    if (access.isDM && body.visibility === "private") return forbidden();

    const updated = await prisma.worldNote.update({ where: { id: noteId }, data: body, include });

    return NextResponse.json(toNote(updated, access.userId));
  });
}

export function deleteNoteHandler(campaignId: string, noteId: string) {
  return withAccess(campaignId, "delete world note", async (access) => {
    const note = await ownedNote(campaignId, noteId);

    if (note instanceof NextResponse) return note;

    if (note.authorUserId !== access.userId) {
      if (note.visibility === "private") return errorResponse(API_ERRORS.WORLD_NOTE_NOT_FOUND, 404);

      if (!access.isDM) return forbidden();
    }

    await prisma.worldNote.delete({ where: { id: noteId } });

    return NextResponse.json({ ok: true });
  });
}
