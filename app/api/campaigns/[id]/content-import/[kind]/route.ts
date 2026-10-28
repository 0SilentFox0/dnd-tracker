import { NextResponse } from "next/server";

import { importContent } from "@/lib/server/content/import/import-content";
import { importKindOf } from "@/lib/server/content/import/kind";
import { translatedImport } from "@/lib/server/content/import/translate-report";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const maxDuration = 120;

export const POST = operationRoute(CONTENT_OPERATIONS["content.import"], async ({ actor, params, body }) => NextResponse.json(await translatedImport(await importContent(actor, importKindOf(params.kind), body))));
