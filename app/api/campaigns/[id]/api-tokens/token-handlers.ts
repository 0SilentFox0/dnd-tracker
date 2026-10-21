import { NextResponse } from "next/server";

import { createApiToken, listApiTokens, revokeApiToken } from "@/lib/ai/api-tokens";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { createApiTokenSchema } from "@/lib/schemas/ai";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function listApiTokensHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listApiTokens(campaignId, access.userId));
  } catch (error) {
    return handleApiError(error, { action: "list api tokens" });
  }
}

export async function createApiTokenHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createApiTokenSchema, req);

    if (body instanceof NextResponse) return body;

    return NextResponse.json(await createApiToken(campaignId, access.userId, body.name), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create api token" });
  }
}

export async function revokeApiTokenHandler(campaignId: string, tokenId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const revoked = await revokeApiToken(campaignId, access.userId, tokenId);

    return revoked ? NextResponse.json({ ok: true }) : errorResponse(API_ERRORS.API_TOKEN_NOT_FOUND, 404);
  } catch (error) {
    return handleApiError(error, { action: "revoke api token" });
  }
}
