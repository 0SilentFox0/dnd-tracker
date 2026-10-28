import { NextResponse } from "next/server";

import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";

export type AccessLevel = "member" | "dm";

export type Actor = { campaignId: string; userId: string; isDM: boolean; via: "session" | "token" };

export async function resolveActor(_req: Request, campaignId: string, need: { access: AccessLevel }): Promise<Actor | NextResponse> {
  const access = need.access === "dm" ? await requireDM(campaignId) : await requireCampaignAccess(campaignId, false);

  if (access instanceof NextResponse) return access;

  return { campaignId, userId: access.userId, isDM: need.access === "dm" || access.isDM === true, via: "session" };
}
