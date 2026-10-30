import { NextResponse } from "next/server";

import { loadScenarioIndex } from "@/lib/server/scenario/index-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function scenarioIndexHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await loadScenarioIndex(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "get scenario index" });
  }
}
