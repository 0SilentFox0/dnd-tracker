import { NextResponse } from "next/server";

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { publishTemplate } from "@/lib/server/templates/publish-service";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const POST = operationRoute(CONTENT_OPERATIONS["template.publish"], async ({ actor }) => NextResponse.json(await publishTemplate(actor)));
