import { NextResponse } from "next/server";

import { type CampaignAccessResult, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function withDM(campaignId: string, action: string, run: (access: CampaignAccessResult) => Promise<NextResponse>): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return await run(access);
  } catch (error) {
    return handleApiError(error, { action });
  }
}
