import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { ownedPage } from "../page-handlers";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_VERSIONS } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { restoreScenarioVersionSchema } from "@/lib/schemas/scenario";
import { parseContent, pruneVersions, readContent, snapshotIfDue, SUMMARY_SELECT, toPage } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildSearchText } from "@/lib/utils/scenario/search-text";

export async function listVersionsHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await ownedPage(campaignId, pageId);

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

    const page = await ownedPage(campaignId, pageId);

    if (page instanceof NextResponse) return page;

    const version = await prisma.scenarioPageVersion.findFirst({ where: { id: body.versionId, pageId } });

    if (!version) return errorResponse(API_ERRORS.SCENARIO_VERSION_NOT_FOUND, 404);

    if (!parseContent(version.content)) return errorResponse(API_ERRORS.SCENARIO_CONTENT_INVALID, 500);

    await snapshotIfDue(pageId, access.userId, { force: true });
    await pruneVersions(pageId);

    const row = await prisma.scenarioPage.update({
      where: { id: pageId },
      data: { content: version.content as Prisma.InputJsonValue, searchText: buildSearchText(page.title, readContent(version.content)), version: { increment: 1 } },
      select: { ...SUMMARY_SELECT, content: true },
    });

    return NextResponse.json(toPage(row));
  } catch (error) {
    return handleApiError(error, { action: "restore scenario version" });
  }
}
