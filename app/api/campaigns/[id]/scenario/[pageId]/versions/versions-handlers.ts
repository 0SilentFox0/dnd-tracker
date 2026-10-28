import { NextResponse } from "next/server";

import { SCENARIO_MAX_VERSIONS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { restoreScenarioVersionSchema } from "@/lib/schemas/scenario";
import { ContentError } from "@/lib/server/content/errors";
import { runScenarioOperation } from "@/lib/server/scenario/action-service";
import { loadOwnedPage } from "@/lib/server/scenario/loaders";
import { OWNED_SELECT } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function listVersionsHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await loadOwnedPage(campaignId, pageId, OWNED_SELECT);

    if (page instanceof NextResponse) return page;

    const rows = await prisma.scenarioPageVersion.findMany({ where: { pageId }, orderBy: { createdAt: "desc" }, take: SCENARIO_MAX_VERSIONS, select: { id: true, createdAt: true, createdBy: true } });

    return NextResponse.json(rows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })));
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "list scenario versions" });
  }
}

export async function restoreVersionHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(restoreScenarioVersionSchema, req);

    if (body instanceof NextResponse) return body;

    const result = await runScenarioOperation({ campaignId, userId: access.userId, isDM: true, via: "session", scopes: null }, "restore", { id: pageId, versionId: body.versionId });

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "restore scenario version" });
  }
}
