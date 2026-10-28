import { NextResponse } from "next/server";

import { runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const DELETE = operationRoute(CONTENT_OPERATIONS["spells.delete-by-level"], async ({ actor, params, body }) => NextResponse.json(await runContentOperation("spells.delete-by-level", actor, { ...params, body })));
