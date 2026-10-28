import { NextResponse } from "next/server";
import type { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { reorderTracksSchema, trackUploadRequestSchema } from "@/lib/schemas/music";
import { isLibraryFull } from "@/lib/server/audio/track-store";
import { runContentOperation } from "@/lib/server/content/operation-service";
import { createTrackUploadTicket } from "@/lib/supabase/battle-music-storage";
import type { Actor } from "@/lib/utils/api/actor";
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

export async function reorderTracks({ actor, body }: { actor: Actor; body: z.infer<typeof reorderTracksSchema> }) {
  try { return NextResponse.json(await runContentOperation("tracks.reorder", actor, { body })); }
  catch (error) { return handleApiError(error, { action: "reorder tracks" }); }
}
