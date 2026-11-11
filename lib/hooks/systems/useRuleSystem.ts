"use client";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { RULE_SYSTEM_REGISTRY, type RuleSystemDefinition, type RuleSystemKey } from "@/lib/utils/rules/systems";

type Source = { key: RuleSystemKey } | { campaignId: string };

type RuleSystemState = { key: RuleSystemKey; system: RuleSystemDefinition; ready: true } | { key: undefined; system: undefined; ready: false };

export function useRuleSystem(source: { key: RuleSystemKey }): Extract<RuleSystemState, { ready: true }>;
export function useRuleSystem(source: Source): RuleSystemState;
export function useRuleSystem(source: Source): RuleSystemState {
  const rules = useCampaignRules("campaignId" in source ? source.campaignId : "");

  const key = "key" in source ? source.key : rules.data?.system.key;

  return key ? { key, system: RULE_SYSTEM_REGISTRY[key], ready: true } : { key: undefined, system: undefined, ready: false };
}
