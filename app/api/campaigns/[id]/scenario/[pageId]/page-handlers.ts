import { NextResponse } from "next/server";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { SCENARIO_MAX_CONTENT_BYTES } from "@/lib/constants/scenario";
import { saveScenarioContentSchema, updateScenarioMetaSchema } from "@/lib/schemas/scenario";
import { ContentError } from "@/lib/server/content/errors";
import { runScenarioOperation,saveScenarioContent } from "@/lib/server/scenario/action-service";
import { loadOwnedPage } from "@/lib/server/scenario/loaders";
import { InvalidScenarioContentError, OWNED_WITH_CONTENT_SELECT, toPage } from "@/lib/server/scenario/page-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";


export async function getScenarioPageHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const page = await loadOwnedPage(campaignId, pageId, OWNED_WITH_CONTENT_SELECT);

    return page instanceof NextResponse ? page : NextResponse.json(toPage(page));
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

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

    const page = await saveScenarioContent({ campaignId, userId: access.userId, isDM: true, via: "session", scopes: null }, pageId, body.content, body.expectedVersion, false);

    return NextResponse.json({ version: page.version });
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "save scenario page" });
  }
}

export async function updateScenarioMetaHandler(req: Request, campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(updateScenarioMetaSchema, req);

    if (body instanceof NextResponse) return body;

    const result = await runScenarioOperation({ campaignId, userId: access.userId, isDM: true, via: "session", scopes: null }, "meta", { id: pageId, patch: body });

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "update scenario page" });
  }
}

export async function deleteScenarioPageHandler(campaignId: string, pageId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    await runScenarioOperation({ campaignId, userId: access.userId, isDM: true, via: "session", scopes: null }, "delete", { id: pageId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContentError) return errorResponse(error.message, error.status, error.issues);

    return handleApiError(error, { action: "delete scenario page" });
  }
}
