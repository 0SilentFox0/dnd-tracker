import { NextResponse } from "next/server";

import { readCampaignOnboarding } from "@/lib/server/onboarding/campaign";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function GET(_request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await readCampaignOnboarding(id, access.userId, access.isDM), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "read campaign onboarding" });
  }
}
