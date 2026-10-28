import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { reorderTracksSchema, trackUploadRequestSchema } from "@/lib/schemas/music";
import { isLibraryFull, listTracks } from "@/lib/server/audio/track-store";
import { createTrackUploadTicket } from "@/lib/supabase/battle-music-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { validateTrackFile } from "@/lib/utils/audio/track-file";


export async function issueUploadTicketHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(trackUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const file = validateTrackFile({ name: body.name, type: body.contentType, size: body.size });

    if (!file.ok) return errorResponse(file.message, 400);

    if (await isLibraryFull(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const ticket = await createTrackUploadTicket(campaignId, file.value);

    return ticket.ok ? NextResponse.json(ticket.value) : errorResponse(ticket.message, 500);
  } catch (error) {
    return handleApiError(error, { action: "issue track upload" });
  }
}

export async function reorderTracksHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(reorderTracksSchema, req);

    if (body instanceof NextResponse) return body;

    const known = new Set((await prisma.campaignTrack.findMany({ where: { campaignId }, select: { id: true } })).map((r) => r.id));

    const exact = body.ids.length === known.size && new Set(body.ids).size === body.ids.length && body.ids.every((id) => known.has(id));

    if (!exact) return errorResponse(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

    await prisma.$transaction(body.ids.map((id, sortOrder) => prisma.campaignTrack.update({ where: { id }, data: { sortOrder } })));

    return NextResponse.json(await listTracks(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "reorder tracks" });
  }
}
