import { NextResponse } from "next/server";

import { discardSlideFiles, pendingSlideUrls } from "@/lib/ai/proposals";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_CONTENT_BYTES } from "@/lib/constants/scenario";
import { prisma } from "@/lib/db";
import { saveScenarioContentSchema, updateScenarioMetaSchema } from "@/lib/schemas/scenario";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { characterInCampaign, loadOwnedPage } from "@/lib/server/scenario/loaders";
import { contentWrite, InvalidScenarioContentError, OWNED_SELECT, OWNED_WITH_CONTENT_SELECT, readContent, SUMMARY_SELECT, toPage, toSummary } from "@/lib/server/scenario/page-store";
import { pruneVersions, snapshotIfDue } from "@/lib/server/scenario/versions";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { buildSearchText } from "@/lib/utils/scenario/search-text";

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

export async function saveScenarioContentHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(saveScenarioContentSchema, req);

    if (body instanceof NextResponse) return body;

    if (Buffer.byteLength(JSON.stringify(body.content)) > SCENARIO_MAX_CONTENT_BYTES) return errorResponse(API_ERRORS.SCENARIO_TOO_LARGE, 413);

    return await withCampaignContentWrite(campaignId, async () => {
    const page = await loadOwnedPage(campaignId, pageId, OWNED_SELECT);

    if (page instanceof NextResponse) return page;

    if (page.version !== body.expectedVersion) return errorResponse(API_ERRORS.SCENARIO_CONFLICT, 409);

    if (await snapshotIfDue(prisma, pageId, access.userId)) await pruneVersions(prisma, pageId);

    const { count } = await prisma.scenarioPage.updateMany({
      where: { id: pageId, version: body.expectedVersion },
      data: { ...contentWrite(page.title, body.content), version: { increment: 1 } },
    });

    if (count === 0) return errorResponse(API_ERRORS.SCENARIO_CONFLICT, 409);

    return NextResponse.json({ version: body.expectedVersion + 1 });
    });
  } catch (error) {
    return handleApiError(error, { action: "save scenario page" });
  }
}

export async function updateScenarioMetaHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(updateScenarioMetaSchema, req);

    if (body instanceof NextResponse) return body;

    return await withCampaignContentWrite(campaignId, async () => {
    const page = await loadOwnedPage(campaignId, pageId, OWNED_SELECT);

    if (page instanceof NextResponse) return page;

    if (!(await characterInCampaign(campaignId, body.characterId))) return errorResponse(API_ERRORS.SCENARIO_CHARACTER_INVALID, 400);

    const titleChanged = body.title !== undefined && body.title !== page.title;

    const current = titleChanged ? await prisma.scenarioPage.findUnique({ where: { id: pageId }, select: { content: true } }) : null;

    const searchText = titleChanged && body.title ? buildSearchText(body.title, readContent(current?.content)) : undefined;

    const row = await prisma.scenarioPage.update({ where: { id: pageId }, data: { ...body, ...(searchText !== undefined && { searchText }) }, select: SUMMARY_SELECT });

    return NextResponse.json(toSummary(row));
    });
  } catch (error) {
    return handleApiError(error, { action: "update scenario page" });
  }
}

export async function deleteScenarioPageHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await loadOwnedPage(campaignId, pageId, OWNED_SELECT);

    if (page instanceof NextResponse) return page;

    const orphanUrls = await pendingSlideUrls(campaignId, pageId);

    await withCampaignContentWrite(campaignId, async () => {
      await prisma.scenarioPage.delete({ where: { id: pageId } });

      if (prisma.compendiumEntry) await prisma.compendiumEntry.deleteMany({ where: { campaignId, kind: "scenarioPages", localId: pageId } });
    });
    await discardSlideFiles(campaignId, orphanUrls);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete scenario page" });
  }
}
