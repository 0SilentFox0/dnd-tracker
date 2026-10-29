import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { loadOwnedPage } from "@/lib/server/scenario/loaders";
import { InvalidScenarioContentError, listPages, OWNED_WITH_CONTENT_SELECT, toPage } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function listScenarioHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listPages(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "list scenario pages" });
  }
}

export async function getScenarioPageHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await loadOwnedPage(campaignId, pageId, OWNED_WITH_CONTENT_SELECT);

    return page instanceof NextResponse ? page : NextResponse.json(toPage(page));
  } catch (error) {
    if (error instanceof InvalidScenarioContentError) return errorResponse(API_ERRORS.SCENARIO_CONTENT_INVALID, 500);

    return handleApiError(error, { action: "get scenario page" });
  }
}
