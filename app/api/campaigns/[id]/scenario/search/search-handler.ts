import { NextResponse } from "next/server";

import { SCENARIO_SEARCH_LIMIT } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { findSnippet } from "@/lib/utils/scenario/search-text";
import type { ScenarioSearchHit } from "@/types/scenario";

export async function searchScenarioHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);

    if (q.length < 2) return NextResponse.json([]);

    const rows = await prisma.scenarioPage.findMany({
      where: { campaignId, searchText: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, searchText: true },
      orderBy: { sortOrder: "asc" },
      take: SCENARIO_SEARCH_LIMIT,
    });

    const hits: ScenarioSearchHit[] = rows.flatMap((r) => {
      const hit = findSnippet(r.searchText, q);

      return hit ? [{ pageId: r.id, pageTitle: r.title, ...hit }] : [];
    });

    return NextResponse.json(hits);
  } catch (error) {
    return handleApiError(error, { action: "search scenario" });
  }
}
