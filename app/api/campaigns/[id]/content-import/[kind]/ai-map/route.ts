import { NextResponse } from "next/server";

import { aiMapRequestSchema } from "@/lib/schemas/content-import";
import { aiMapAvailable, aiMapResponse } from "@/lib/server/content/import/ai-map";
import { importKindOf } from "@/lib/server/content/import/kind";
import { type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { NEED } from "@/lib/utils/api/need";
import { parseBody } from "@/lib/utils/api/parse-body";

export const maxDuration = 60;

export const GET = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.writeAll, action: "import ai availability" }, async (actor, params) => {
    importKindOf(params.kind);

    return NextResponse.json({ available: await aiMapAvailable(actor) });
  });

export const POST = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.writeAll, action: "import ai map" }, async (actor, params) => {
    const kind = importKindOf(params.kind);

    const body = await parseBody(aiMapRequestSchema, req);

    if (body instanceof NextResponse) return body;

    return aiMapResponse(actor, kind, body);
  });
