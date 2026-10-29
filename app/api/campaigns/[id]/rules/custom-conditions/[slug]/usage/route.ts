import { NextResponse } from "next/server";

import { readCustomConditionUsage } from "@/lib/server/campaigns/rules";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["rules.condition-usage"], async ({ actor, params }) => NextResponse.json(await readCustomConditionUsage(actor, params.slug)));
