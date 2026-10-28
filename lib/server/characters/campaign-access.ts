import { NextResponse } from "next/server";

import "server-only";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/utils/api/actor";
import { type CampaignAccessResult, requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { parseRules } from "@/lib/utils/rules/schema";
/** Resolve actual membership and rules for actor calls; session paths retain their existing auth. */
export async function operationAccess(campaignId: string, dmOnly: boolean, actor?: Actor): Promise<CampaignAccessResult | NextResponse> {
  if (!actor) return requireCampaignAccess(campaignId, dmOnly);

  if (actor.campaignId !== campaignId) return errorResponse("Доступ заборонено", 403);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, kind: true, maxLevel: true, rules: true, allowPlayerEdit: true, members: { where: { userId: actor.userId }, select: { userId: true, role: true } } } });

  if (!campaign) return errorResponse("Кампанію не знайдено", 404);

  const isDM = campaign.members.some(m => m.userId === actor.userId && m.role === "dm");

  if (!campaign.members.some(m => m.userId === actor.userId) || (dmOnly && !isDM)) return errorResponse("Доступ заборонено", 403);

  return { userId: actor.userId, isDM, campaign: { ...campaign, rules: parseRules(campaign.rules) } };
}

export function operationDM(campaignId: string, actor?: Actor) {
  return actor ? operationAccess(campaignId, true, actor) : requireDM(campaignId);
}
