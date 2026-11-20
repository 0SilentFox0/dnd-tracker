import { useMemo } from 'react';

import {
    type CanonCtx,
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
    canon,
}: {
    picks: CreationPicks;
    enabled: boolean;
    profile?: SpeciesProfile;
    rules?: PlanRules;
    careerIds: string[];
    featIds: string[];
    canon?: CanonCtx;
}) {
    return useMemo<PlanDraftResult | undefined>(() => {
        if (!enabled || !profile || !rules) return undefined;

        return planDraft(picks, {
            profile,
            rules,
            careerIds: new Set(careerIds),
            featIds: new Set(featIds),
            canon,
        });
    }, [enabled, profile, rules, picks, careerIds, featIds, canon]);
}
