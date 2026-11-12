'use client';

import { useCampaignRules } from '@/lib/hooks/campaigns';
import type { Ruleset } from '@/lib/utils/rules/schema';
import {
    RULE_SYSTEM_REGISTRY,
    type RuleSystemDefinition,
    ruleSystemOf,
} from '@/lib/utils/rules/systems';

export interface CampaignSystem {
    def: RuleSystemDefinition;
    system: { key: string; modules?: readonly string[] };
    ready: boolean;
}

/** For callers that only learn the fallback key inside a render callback (the sheet loads after the hook position) */
export function campaignSystemOf(
    rules: Ruleset | undefined,
    fallbackKey: string
): CampaignSystem {
    if (!rules)
        return {
            def: RULE_SYSTEM_REGISTRY[fallbackKey],
            system: { key: fallbackKey },
            ready: false,
        };

    return { def: ruleSystemOf(rules), system: rules.system, ready: true };
}

export function useCampaignSystem(
    campaignId: string,
    fallbackKey: string
): CampaignSystem {
    return campaignSystemOf(useCampaignRules(campaignId).data, fallbackKey);
}
