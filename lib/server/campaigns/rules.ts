import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import type { Actor } from "@/lib/utils/api/actor";
import type { Ruleset, RulesetPatch } from "@/lib/utils/rules/schema";
import { mergeRules, parseRules } from "@/lib/utils/rules/schema";

async function loadRules(campaignId: string): Promise<Ruleset> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

  if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  return parseRules(campaign.rules);
}

export function readCampaignRules(actor: Actor): Promise<Ruleset> {
  assertCan(actor, CONTENT_OPERATIONS["rules.get"].need);

  return loadRules(actor.campaignId);
}

export async function updateCampaignRules(actor: Actor, patch: RulesetPatch): Promise<Ruleset> {
  assertCan(actor, CONTENT_OPERATIONS["rules.update"].need);

  const merged = mergeRules(await loadRules(actor.campaignId), patch);

  if (!merged.ok) throw new ContentError(API_ERRORS.INVALID_RULES, 400, merged.issues);

  await prisma.campaign.update({ where: { id: actor.campaignId }, data: { rules: merged.rules as Prisma.InputJsonObject } });

  return merged.rules;
}
