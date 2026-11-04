import { campaignGet, campaignPatch } from "@/lib/api/client";
import type { RulesetPatch } from "@/lib/utils/rules";
import type { CampaignRulesView, ConditionUsage } from "@/types/campaigns";

export function getCampaignRules(campaignId: string): Promise<CampaignRulesView> {
  return campaignGet<CampaignRulesView>(campaignId, "/rules");
}

export function updateCampaignRules(campaignId: string, patch: RulesetPatch): Promise<CampaignRulesView> {
  return campaignPatch<CampaignRulesView>(campaignId, "/rules", patch);
}

export function getCustomConditionUsage(campaignId: string, key: string): Promise<ConditionUsage> {
  return campaignGet<ConditionUsage>(campaignId, `/rules/custom-conditions/${key.slice("custom:".length)}/usage`);
}

export function removeCustomConditions(campaignId: string, keys: string[]): Promise<CampaignRulesView> {
  return updateCampaignRules(campaignId, { removeCustomConditions: keys });
}
