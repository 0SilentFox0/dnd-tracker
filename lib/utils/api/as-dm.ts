import { NextResponse } from "next/server";

import { type CampaignAccessResult, requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function withAccess(campaignId: string, action: string, run: (access: CampaignAccessResult) => Promise<NextResponse>, dmOnly = false): Promise<NextResponse> {
  try {
    const access = await (dmOnly ? requireDM(campaignId) : requireCampaignAccess(campaignId));

    return access instanceof NextResponse ? access : await run(access);
  } catch (error) {
    return handleApiError(error, { action });
  }
}

export const withDM = (campaignId: string, action: string, run: (access: CampaignAccessResult) => Promise<NextResponse>) => withAccess(campaignId, action, run, true);
