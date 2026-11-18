import { useMemo } from 'react';

import {
    type CreationPicks,
    planDraft,
    type PlanDraftResult,
    type SpeciesProfile,
} from '@/systems/wfrp/rules/creation';

type PlanRules = Parameters<typeof planDraft>[1]['rules'];

export function useWfrpDraftPlan({
    picks,
    enabled,
    profile,
    rules,
    careerIds,
    featIds,
}: {
    picks: CreationPicks;
    enabled: boolean;
    profile?: SpeciesProfile;
    rules?: PlanRules;
    careerIds: string[];
    featIds: string[];
}) {
    return useMemo<PlanDraftResult | undefined>(() => {
        if (!enabled || !profile || !rules) return undefined;

        return planDraft(picks, {
            profile,
            rules,
            careerIds: new Set(careerIds),
            featIds: new Set(featIds),
        });
    }, [enabled, profile, rules, picks, careerIds, featIds]);
}
