import { NextResponse } from "next/server";

import { getOpenApiDocument } from "@/lib/server/content/openapi";

export const dynamic = "force-static";

export const GET = (_req: Request) =>
  NextResponse.json(getOpenApiDocument(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } });
