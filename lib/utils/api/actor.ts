import { NextResponse } from "next/server";

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { type ActionScope, type ApiTokenScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { bearerToken } from "@/lib/utils/api/bearer";
import { needFailure } from "@/lib/utils/api/need";

export type AccessLevel = "member" | "dm";

export type ActorNeed = { access: AccessLevel; scope: ActionScope; sessionOnly?: true };

export type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token"; scopes: readonly ApiTokenScope[] | null };

export const tokenActorOf = (t: { campaignId: string; userId: string; scopes: readonly ApiTokenScope[] }): Actor => ({ campaignId: t.campaignId, userId: t.userId, scopes: t.scopes, isDM: true, via: "token" });

export async function verifyBearer(raw: string | null, campaignId: string | null): Promise<{ tokenId: string; campaignId: string; userId: string; scopes: ApiTokenScope[] } | NextResponse> {
  const token = raw ? await verifyApiToken(raw) : null;

  if (!token) return errorResponse(API_ERRORS.UNAUTHORIZED, 401);

  if (campaignId !== null && token.campaignId !== campaignId) return errorResponse(API_ERRORS.API_TOKEN_WRONG_CAMPAIGN, 403);

  return { tokenId: token.id, campaignId: token.campaignId, userId: token.userId, scopes: token.scopes };
}

export async function authenticateToken(raw: string | null, campaignId: string | null, need: ActorNeed): Promise<Actor | NextResponse> {
  const token = await verifyBearer(raw, campaignId);

  if (token instanceof NextResponse) return token;

  const actor = tokenActorOf(token);

  const failure = needFailure(actor, need);

  return failure ? errorResponse(failure, 403) : actor;
}

/** With an Authorization header only the token counts — a bad token never falls back to the cookie session. */
export async function resolveActor(req: Request, campaignId: string, need: ActorNeed): Promise<Actor | NextResponse> {
  const raw = bearerToken(req);

  if (raw !== null) return authenticateToken(raw, campaignId, need);

  const access = need.access === "dm" ? await requireDM(campaignId) : await requireCampaignAccess(campaignId, false);

  if (access instanceof NextResponse) return access;

  return { campaignId, userId: access.userId, isDM: need.access === "dm" || access.isDM === true, via: "session", scopes: null };
}
