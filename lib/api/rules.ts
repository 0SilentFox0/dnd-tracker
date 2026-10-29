import { campaignGet, campaignPatch } from "@/lib/api/client";
import type { Ruleset, RulesetPatch } from "@/lib/utils/rules";
import type { ConditionUsage } from "@/types/campaigns";

export function getCampaignRules(campaignId: string): Promise<Ruleset> {
  return campaignGet<Ruleset>(campaignId, "/rules");
}

export function updateCampaignRules(campaignId: string, patch: RulesetPatch): Promise<Ruleset> {
  return campaignPatch<Ruleset>(campaignId, "/rules", patch);
}

export function getCustomConditionUsage(campaignId: string, key: string): Promise<ConditionUsage> {
  return campaignGet<ConditionUsage>(campaignId, `/rules/custom-conditions/${key.slice("custom:".length)}/usage`);
}

export function removeCustomConditions(campaignId: string, keys: string[]): Promise<Ruleset> {
  return updateCampaignRules(campaignId, { removeCustomConditions: keys });
}
