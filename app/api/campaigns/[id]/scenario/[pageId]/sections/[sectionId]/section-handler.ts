import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { scenarioSectionPatchSchema } from "@/lib/schemas/scenario";
import { loadOwnedPage } from "@/lib/server/scenario/loaders";
import { InvalidScenarioContentError, OWNED_WITH_CONTENT_SELECT, readContentStrict, toJson } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { updateSection } from "@/lib/utils/scenario/structure";

export async function patchScenarioSectionHandler(req: Request, campaignId: string, pageId: string, sectionId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(scenarioSectionPatchSchema, req);

    if (body instanceof NextResponse) return body;

    const page = await loadOwnedPage(campaignId, pageId, OWNED_WITH_CONTENT_SELECT);

    if (page instanceof NextResponse) return page;

    const content = readContentStrict(page.content);

    if (!content.sections.some((s) => s.id === sectionId)) return errorResponse(API_ERRORS.SCENARIO_SECTION_NOT_FOUND, 404);

    const next = updateSection(content, sectionId, {
      ...(body.played !== undefined && { played: body.played }),
      ...(body.revealed !== undefined && { revealedAt: body.revealed ? new Date().toISOString() : null }),
    });

    const { count } = await prisma.scenarioPage.updateMany({ where: { id: pageId, version: page.version }, data: { content: toJson(next), version: { increment: 1 } } });

    if (count === 0) return errorResponse(API_ERRORS.SCENARIO_CONFLICT, 409);

    return NextResponse.json({ version: page.version + 1, section: next.sections.find((s) => s.id === sectionId) });
  } catch (error) {
    if (error instanceof InvalidScenarioContentError) return errorResponse(API_ERRORS.SCENARIO_CONTENT_INVALID, 500);

    return handleApiError(error, { action: "patch scenario section" });
  }
}
