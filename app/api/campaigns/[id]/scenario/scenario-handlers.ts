import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { DEFAULT_SCENE_LEGEND } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { createScenarioPageSchema } from "@/lib/schemas/scenario";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { characterInCampaign } from "@/lib/server/scenario/loaders";
import { contentWrite, listPages, SUMMARY_SELECT, toSummary } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { newSection } from "@/lib/utils/scenario/structure";
import type { ScenarioContent } from "@/types/scenario";

export async function listScenarioHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listPages(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "list scenario pages" });
  }
}

export async function createScenarioHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createScenarioPageSchema, req);

    if (body instanceof NextResponse) return body;

    return await withCampaignContentWrite(campaignId, async () => {
    if (!(await characterInCampaign(campaignId, body.characterId))) return errorResponse(API_ERRORS.SCENARIO_CHARACTER_INVALID, 400);

    const content: ScenarioContent = { legend: body.kind === "scene" ? DEFAULT_SCENE_LEGEND : [], sections: [newSection(body.kind === "hero" ? "Історія" : "Розділ 1")] };

    const last = await prisma.scenarioPage.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.scenarioPage.create({
      data: {
        campaignId,
        kind: body.kind,
        title: body.title,
        arc: body.arc ?? null,
        subtitle: body.subtitle ?? null,
        characterId: body.characterId ?? null,
        status: "draft",
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        ...contentWrite(body.title, content),
      },
      select: SUMMARY_SELECT,
    });

    return NextResponse.json(toSummary(row), { status: 201 });
    });
  } catch (error) {
    return handleApiError(error, { action: "create scenario page" });
  }
}
