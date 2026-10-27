import { NextResponse } from "next/server";

import { worldUploadRequestSchema } from "@/lib/schemas/world";
import { createWorldMapUploadTicket } from "@/lib/supabase/world-map-storage";
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
