import { NextResponse } from "next/server";

import { readShowState } from "@/lib/server/show/show-store";
import { showForViewer } from "@/lib/server/show/viewer-show";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { ShowResponse } from "@/types/show";

export async function readShow(campaignId: string): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(campaignId, false, { allowDemo: true });

    if (access instanceof NextResponse) return access;

    const body: ShowResponse = { show: await showForViewer(campaignId, access, await readShowState(campaignId)) };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "read show" });
  }
}
