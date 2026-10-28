import { NextResponse } from "next/server";

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { type ApiTokenScope, type ContentScope, hasScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bearerToken } from "@/lib/utils/api/bearer";

export type AccessLevel = "member" | "dm";

export type ActorNeed = { access: AccessLevel; scope: ContentScope; sessionOnly?: true };

export type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token" };

export async function authenticateToken(
  raw: string | null,
  campaignId: string | null,
  scope: ApiTokenScope,
  opts?: { sessionOnly?: true },
): Promise<{ campaignId: string; userId: string } | NextResponse> {
  const token = raw ? await verifyApiToken(raw) : null;

  if (!token) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

  if (campaignId !== null && token.campaignId !== campaignId) return errorResponse(API_ERRORS.API_TOKEN_WRONG_CAMPAIGN, 403);

  if (opts?.sessionOnly) return errorResponse(API_ERRORS.API_TOKEN_SESSION_ONLY, 403);

  if (!hasScope(token.scopes, scope)) return errorResponse(API_ERRORS.API_TOKEN_SCOPE_MISSING, 403);

  return { campaignId: token.campaignId, userId: token.userId };
}

async function tokenActor(raw: string, campaignId: string, need: ActorNeed): Promise<Actor | NextResponse> {
  const auth = await authenticateToken(raw, campaignId, need.scope, need.sessionOnly ? { sessionOnly: true } : undefined);

  if (auth instanceof NextResponse) return auth;

  return { campaignId, userId: auth.userId, isDM: true, via: "token" };
}

/** With an Authorization header only the token counts — a bad token never falls back to the cookie session. */
export async function resolveActor(req: Request, campaignId: string, need: ActorNeed): Promise<Actor | NextResponse> {
  const raw = bearerToken(req);

  if (raw !== null) return tokenActor(raw, campaignId, need);

  const access = need.access === "dm" ? await requireDM(campaignId) : await requireCampaignAccess(campaignId, false);

  if (access instanceof NextResponse) return access;

  return { campaignId, userId: access.userId, isDM: need.access === "dm" || access.isDM === true, via: "session" };
}
