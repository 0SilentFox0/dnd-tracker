import { NextResponse } from "next/server";

import { createApiToken, listApiTokens, revokeApiToken } from "@/lib/ai/api-tokens";
import { guarded } from "@/lib/ai/guarded";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind } from "@/lib/constants/campaigns";
import { createApiTokenSchema } from "@/lib/schemas/ai";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseBody } from "@/lib/utils/api/parse-body";

export const listApiTokensHandler = (campaignId: string) =>
  guarded("list api tokens", () => requireDM(campaignId), async (access) => NextResponse.json(await listApiTokens(campaignId, access.userId)));

export const createApiTokenHandler = (req: Request, campaignId: string) =>
  guarded("create api token", () => requireDM(campaignId), async (access) => {
    const body = await parseBody(createApiTokenSchema, req);

    if (body instanceof NextResponse) return body;

    if (access.campaign.kind === CampaignKind.TEMPLATE && body.scopes.includes("ai")) return errorResponse(API_ERRORS.API_TOKEN_AI_ON_TEMPLATE, 400);

    return NextResponse.json(await createApiToken(campaignId, access.userId, body), { status: 201 });
  });

export const revokeApiTokenHandler = (campaignId: string, tokenId: string) =>
  guarded("revoke api token", () => requireDM(campaignId), async (access) =>
    (await revokeApiToken(campaignId, access.userId, tokenId)) ? NextResponse.json({ ok: true }) : errorResponse(API_ERRORS.API_TOKEN_NOT_FOUND, 404));
