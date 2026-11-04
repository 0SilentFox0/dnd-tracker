import type { Prisma } from "@prisma/client";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { findCustomConditionUsage } from "@/lib/server/campaigns/condition-usage";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { CUSTOM_CONDITION_KEY_RE, type CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { Actor } from "@/lib/utils/api/actor";
import { isConditionUsed } from "@/lib/utils/rules/condition-usage";
import type { Ruleset, RulesetPatch } from "@/lib/utils/rules/schema";
import { mergeRules, parseRules } from "@/lib/utils/rules/schema";
import type { CampaignRulesView, ConditionUsage } from "@/types/campaigns";

export async function loadRules(campaignId: string): Promise<Ruleset> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

  if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  return parseRules(campaign.rules);
}

type CountClient = Pick<Prisma.TransactionClient, "character" | "unit">;

async function hasSystemBoundContent(db: CountClient, campaignId: string): Promise<boolean> {
  const [characters, units] = await Promise.all([db.character.count({ where: { campaignId } }), db.unit.count({ where: { campaignId } })]);

  return characters + units > 0;
}

export async function readCampaignRules(actor: Actor): Promise<CampaignRulesView> {
  assertCan(actor, CONTENT_OPERATIONS["rules.get"].need);

  const [rules, systemLocked] = await Promise.all([loadRules(actor.campaignId), hasSystemBoundContent(prisma, actor.campaignId)]);

  return { ...rules, systemLocked };
}

export async function updateCampaignRules(actor: Actor, patch: RulesetPatch): Promise<CampaignRulesView> {
  assertCan(actor, CONTENT_OPERATIONS["rules.update"].need);

  return withCampaignContentWrite(actor.campaignId, async (tx) => {
    const current = await loadRules(actor.campaignId);

    for (const key of patch.removeCustomConditions ?? []) {
      const condition = current.conditions.custom?.find((c) => c.key === key);

      if (condition && isConditionUsed(await findCustomConditionUsage(actor.campaignId, key as CustomConditionKey, tx))) throw new ContentError(API_ERRORS.RULES_CUSTOM_CONDITION_IN_USE, 409, undefined, { name: condition.name });
    }

    const systemLocked = await hasSystemBoundContent(tx, actor.campaignId);

    if (systemLocked && patch.system?.key && patch.system.key !== current.system.key) throw new ContentError(API_ERRORS.SYSTEM_LOCKED, 409);

    const merged = mergeRules(current, patch);

    if (!merged.ok) throw new ContentError(API_ERRORS.INVALID_RULES, 400, merged.issues);

    await prisma.campaign.update({ where: { id: actor.campaignId }, data: { rules: merged.rules as Prisma.InputJsonObject } });

    return { ...merged.rules, systemLocked };
  });
}

export async function readCustomConditionUsage(actor: Actor, slug: string): Promise<ConditionUsage> {
  assertCan(actor, CONTENT_OPERATIONS["rules.condition-usage"].need);

  const key = `custom:${slug}`;

  if (!CUSTOM_CONDITION_KEY_RE.test(key)) throw new ContentError(API_ERRORS.INVALID_RULES, 400);

  const rules = await loadRules(actor.campaignId);

  if (!rules.conditions.custom?.some((c) => c.key === key)) throw new ContentError(API_ERRORS.RULES_CUSTOM_CONDITION_NOT_FOUND, 404);

  return findCustomConditionUsage(actor.campaignId, key as CustomConditionKey);
}
