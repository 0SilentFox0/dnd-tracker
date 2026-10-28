import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import type { Ruleset, RulesetPatch } from "@/lib/utils/rules/schema";
import { mergeRules, parseRules } from "@/lib/utils/rules/schema";

export async function readCampaignRules(campaignId: string): Promise<Ruleset> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

  if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  return parseRules(campaign.rules);
}

export async function updateCampaignRules(campaignId: string, patch: RulesetPatch): Promise<Ruleset> {
  const merged = mergeRules(await readCampaignRules(campaignId), patch);

  if (!merged.ok) throw new ContentError(API_ERRORS.INVALID_RULES, 400, merged.issues);

  await prisma.campaign.update({ where: { id: campaignId }, data: { rules: merged.rules as Prisma.InputJsonObject } });

  return merged.rules;
}
