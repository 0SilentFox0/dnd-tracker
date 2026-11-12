'use client';

import { useCampaignRules } from '@/lib/hooks/campaigns';
import {
    RULE_SYSTEM_REGISTRY,
    type RuleSystemDefinition,
    ruleSystemOf,
} from '@/lib/utils/rules/systems';

type Source = { key: string } | { campaignId: string };

type RuleSystemState =
    | { key: string; system: RuleSystemDefinition; ready: true }
    | { key: undefined; system: undefined; ready: false };

export function useRuleSystem(source: {
    key: string;
}): Extract<RuleSystemState, { ready: true }>;
export function useRuleSystem(source: Source): RuleSystemState;
export function useRuleSystem(source: Source): RuleSystemState {
    const rules = useCampaignRules(
        'campaignId' in source ? source.campaignId : ''
    );

    if ('key' in source)
        return {
            key: source.key,
            system: RULE_SYSTEM_REGISTRY[source.key],
            ready: true,
        };

    return rules.data
        ? {
              key: rules.data.system.key,
              system: ruleSystemOf(rules.data),
              ready: true,
          }
        : { key: undefined, system: undefined, ready: false };
}
