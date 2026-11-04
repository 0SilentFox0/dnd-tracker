"use client";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { RULE_SYSTEM_REGISTRY, type RuleSystemDefinition, type RuleSystemKey } from "@/lib/utils/rules/systems";

type Source = { key: RuleSystemKey } | { campaignId: string };

export function useRuleSystem(source: Source): { key: RuleSystemKey; system: RuleSystemDefinition; ready: boolean } {
  const rules = useCampaignRules("campaignId" in source ? source.campaignId : "");

  const key = "key" in source ? source.key : (rules.data?.system.key ?? "homm");

  return { key, system: RULE_SYSTEM_REGISTRY[key], ready: "key" in source || !!rules.data };
}
