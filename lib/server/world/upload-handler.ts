import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { worldDiscardUploadSchema, worldUploadRequestSchema } from "@/lib/schemas/world";
import { createWorldMapUploadTicket, ownedWorldMapPath, removeWorldMapFiles } from "@/lib/supabase/world-map-storage";
import { errorResponse } from "@/lib/utils/api/api-response";
import { withDM } from "@/lib/utils/api/as-dm";
import { parseBody } from "@/lib/utils/api/parse-body";

export function issueWorldUploadHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "issue world map upload", async () => {
    const body = await parseBody(worldUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const ticket = await createWorldMapUploadTicket(campaignId, body.contentType);

    return ticket.ok ? NextResponse.json(ticket.value) : errorResponse(ticket.message, 500);
  });
}

export function discardWorldUploadHandler(req: Request, campaignId: string) {
  return withDM(campaignId, "discard world map upload", async () => {
    const body = await parseBody(worldDiscardUploadSchema, req);

    if (body instanceof NextResponse) return body;

    if (!ownedWorldMapPath(campaignId, body.imageUrl)) return errorResponse(API_ERRORS.WORLD_IMAGE_FOREIGN, 400);

    const used = await prisma.worldMap.count({ where: { campaignId, imageUrl: body.imageUrl } });

    if (used === 0) await removeWorldMapFiles(campaignId, [body.imageUrl]);

    return NextResponse.json({ ok: true });
  });
}
