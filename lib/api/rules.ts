import { campaignGet, campaignPatch } from "@/lib/api/client";
import type { Ruleset, RulesetPatch } from "@/lib/utils/rules";

export function getCampaignRules(campaignId: string): Promise<Ruleset> {
  return campaignGet<Ruleset>(campaignId, "/rules");
}

export function updateCampaignRules(campaignId: string, patch: RulesetPatch): Promise<Ruleset> {
  return campaignPatch<Ruleset>(campaignId, "/rules", patch);
}
