import { NextResponse } from "next/server";

import { searchScenarioMentions } from "@/lib/server/scenario/mentions";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";


export async function searchMentionsHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);

    const options = await searchScenarioMentions(campaignId, q);

    return NextResponse.json(options);
  } catch (error) {
    return handleApiError(error, { action: "search scenario mentions" });
  }
}
