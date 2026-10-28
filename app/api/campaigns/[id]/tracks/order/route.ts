import { NextResponse } from "next/server";

import { runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const PUT = operationRoute(CONTENT_OPERATIONS["tracks.reorder"], async ({ actor, params, body }) => NextResponse.json(await runContentOperation("tracks.reorder", actor, { ...params, body })));
