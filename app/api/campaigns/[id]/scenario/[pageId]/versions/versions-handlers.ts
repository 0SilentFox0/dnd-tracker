import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_VERSIONS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { restoreScenarioVersionSchema } from "@/lib/schemas/scenario";
import { loadOwnedPage } from "@/lib/server/scenario/loaders";
import { contentWrite, OWNED_SELECT, parseContent, SUMMARY_SELECT, toPage } from "@/lib/server/scenario/page-store";
import { pruneVersions, snapshotIfDue } from "@/lib/server/scenario/versions";
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
    return handleApiError(error, { action: "list scenario versions" });
  }
}

export async function restoreVersionHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(restoreScenarioVersionSchema, req);

    if (body instanceof NextResponse) return body;

    const page = await loadOwnedPage(campaignId, pageId, OWNED_SELECT);

    if (page instanceof NextResponse) return page;

    const version = await prisma.scenarioPageVersion.findFirst({ where: { id: body.versionId, pageId } });

    if (!version) return errorResponse(API_ERRORS.SCENARIO_VERSION_NOT_FOUND, 404);

    const restored = parseContent(version.content);

    if (!restored) return errorResponse(API_ERRORS.SCENARIO_CONTENT_INVALID, 500);

    await snapshotIfDue(prisma, pageId, access.userId, { force: true });
    await pruneVersions(prisma, pageId);

    const row = await prisma.scenarioPage.update({
      where: { id: pageId },
      data: { ...contentWrite(page.title, restored), version: { increment: 1 } },
      select: { ...SUMMARY_SELECT, content: true },
    });

    return NextResponse.json(toPage(row));
  } catch (error) {
    return handleApiError(error, { action: "restore scenario version" });
  }
}
