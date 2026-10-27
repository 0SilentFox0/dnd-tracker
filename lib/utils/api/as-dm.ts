import { NextResponse } from "next/server";

import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function withDM(campaignId: string, action: string, run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return await run();
  } catch (error) {
    return handleApiError(error, { action });
  }
}
