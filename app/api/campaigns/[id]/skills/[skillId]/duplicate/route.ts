import { NextResponse } from "next/server";

import { runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const POST = operationRoute(CONTENT_OPERATIONS["skills.duplicate"], async ({ actor, params, body }) => NextResponse.json(await runContentOperation("skills.duplicate", actor, { ...params, body })));
