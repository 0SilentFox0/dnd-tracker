import { NextResponse } from "next/server";

import { searchScenarioPages } from "@/lib/server/scenario/search";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function searchScenarioHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);

    if (q.length < 2) return NextResponse.json([]);

    const hits = await searchScenarioPages(campaignId, q);

    return NextResponse.json(hits);
  } catch (error) {
    return handleApiError(error, { action: "search scenario" });
  }
}
