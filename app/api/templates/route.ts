import { NextResponse } from "next/server";

import { listTemplates } from "@/lib/server/templates/list-templates";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET() {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof NextResponse) return authResult;

    return NextResponse.json(await listTemplates(authResult.userId), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "list templates" });
  }
}
