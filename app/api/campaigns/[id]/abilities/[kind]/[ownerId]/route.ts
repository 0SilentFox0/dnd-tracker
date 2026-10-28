import { NextResponse } from "next/server";

import { runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["abilities.get"], async ({ actor, params, body }) => NextResponse.json(await runContentOperation("abilities.get", actor, { ...params, body })));
