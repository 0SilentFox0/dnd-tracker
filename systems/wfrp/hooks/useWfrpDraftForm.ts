import { useCallback, useMemo, useState } from 'react';

import {
    careerPickValid,
    FULL_STEPS,
    STEP_ERRORS,
    VISIBLE_STEP_ERRORS,
    type WfrpDraftStepId,
} from './draft-form-helpers';
import { useRaceProfiles } from './useRaceProfiles';
import { useWfrpDraftPicks } from './useWfrpDraftPicks';
import { useWfrpDraftPlan } from './useWfrpDraftPlan';
import { useWfrpDraftRolls } from './useWfrpDraftRolls';
import { useWfrpDraftSubmit } from './useWfrpDraftSubmit';
import { useWfrpSpecies } from './useWfrpSpecies';

import { useCampaignRules } from '@/lib/hooks/campaigns';
import { useRollReveal } from '@/lib/hooks/characters';
import { useFeats } from '@/lib/hooks/feats';
import { useRaces } from '@/lib/hooks/races';
import { useRuleSystem } from '@/lib/hooks/systems';
import { cryptoRandom } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { WfrpDraftIdentityInput } from '@/systems/wfrp/api/types';
import { useCareers } from '@/systems/wfrp/hooks/careers';

export type { WfrpDraftStepId };

export interface WfrpDraftFormOptions {
    campaignId: string;
    characterId?: string;
    initialIdentity?: WfrpDraftIdentityInput;
    rng?: Rng;
}

export function useWfrpDraftForm({
    campaignId,
    characterId,
    initialIdentity,
    rng = cryptoRandom,
}: WfrpDraftFormOptions) {
    const { system } = useRuleSystem({ campaignId });

    const rules = useCampaignRules(campaignId).data?.advancement;

    const races = useRaces(campaignId);

    const profiles = useRaceProfiles(campaignId);

    const careers = useCareers(campaignId);

    const feats = useFeats(campaignId);

    const reveal = useRollReveal<string>();

    const identityOnly = !!characterId;

    const steps = identityOnly
        ? (['identity'] as WfrpDraftStepId[])
        : FULL_STEPS;

    const [index, setIndex] = useState(0);

    const draft = useWfrpDraftPicks();

    const { picks, speciesId, selectSpecies } = draft;

    const [identity, setIdentity] = useState<WfrpDraftIdentityInput>(
        initialIdentity ?? { name: '' }
    );

    const creation = system?.creation;

    const species = useWfrpSpecies({
        enabled: !!creation,
        profiles: profiles.data,
        races: races.data,
    });

    const selected = species.find((s) => s.race.id === speciesId);

    const profile = selected?.profile;

    const talentCount =
        profile && profile.randomTalents.length ? profile.randomTalentCount : 0;

    const careerName = useCallback(
        (id: string) => careers.data?.find((c) => c.id === id)?.name ?? id,
        [careers.data]
    );

    const featName = useCallback(
        (id: string) => feats.data?.find((f) => f.id === id)?.name ?? id,
        [feats.data]
    );

    const careerIds = useMemo(
        () => (careers.data ?? []).map((c) => c.id),
        [careers.data]
    );

    const featIds = useMemo(
        () => (feats.data ?? []).map((f) => f.id),
        [feats.data]
    );

    const preview = useWfrpDraftPlan({
        picks,
        enabled: !identityOnly && !!creation,
        profile,
        rules,
        careerIds,
        featIds,
    });

    const errorsFor = (id: WfrpDraftStepId) =>
        preview && !preview.ok ? preview.errors.filter(STEP_ERRORS[id]) : [];

    const stepId = steps[index];

    const valid: Record<WfrpDraftStepId, boolean> = {
        species: !!profile,
        career:
            !!draft.career.id &&
            errorsFor('career').length === 0 &&
            careerPickValid(
                draft.career.mode,
                draft.career.id,
                draft.career.rolls
            ),
        stats: !!preview && errorsFor('stats').length === 0,
        talents:
            !!preview &&
            errorsFor('talents').length === 0 &&
            draft.talents.rolled.length === talentCount,
        identity:
            identity.name.trim().length > 0 &&
            (identityOnly || (!!preview && preview.ok)),
    };

    const stepErrors = (id: WfrpDraftStepId) =>
        errorsFor(id).filter(
            (c) =>
                VISIBLE_STEP_ERRORS.has(c) &&
                (c !== 'CAREER_UNKNOWN' || !!draft.career.id)
        );

    const rolls = useWfrpDraftRolls({
        rng,
        reveal,
        profile,
        enabled: !!creation,
        names: { career: careerName, feat: featName },
        career: {
            mode: draft.career.mode,
            rolls: draft.career.rolls,
            setRolls: draft.career.setRolls,
            setId: draft.career.setId,
        },
        stats: {
            rolls: draft.stats.rolls,
            setRolls: draft.stats.setRolls,
            setArranged: draft.stats.setArranged,
        },
        talents: { rolled: draft.talents.rolled, set: draft.talents.set },
    });

    const submit = useWfrpDraftSubmit({
        campaignId,
        characterId,
        identity,
        speciesId,
        picks,
        canRun: valid.identity,
    });

    return {
        step: {
            id: stepId,
            index,
            total: steps.length,
            canNext: valid[stepId],
            hideNext:
                stepId === 'species' &&
                (races.isPending || profiles.isPending || species.length === 0),
            next: () => setIndex((i) => Math.min(i + 1, steps.length - 1)),
            back: () => setIndex((i) => Math.max(i - 1, 0)),
        },
        species: {
            data: species,
            selected: speciesId,
            select: selectSpecies,
            loading: races.isPending || profiles.isPending,
        },
        career: {
            mode: draft.career.mode,
            setMode: draft.career.setMode,
            rolls: draft.career.rolls,
            roll: rolls.careerRoll,
            careerId: draft.career.id,
            pick: draft.career.setId,
            table: profile?.careerTable ?? [],
            all: careers.data ?? [],
        },
        stats: {
            mode: draft.stats.mode,
            setMode: draft.stats.setMode,
            rolls: draft.stats.rolls,
            roll: rolls.statsRoll,
            arranged: draft.stats.arranged,
            swap: draft.stats.swap,
            points: draft.stats.points,
            setPoint: draft.stats.setPoint,
            budget: rules?.creation.freeBudget ?? 0,
        },
        talents: {
            fixed: profile?.talents ?? [],
            count: talentCount,
            rolled: draft.talents.rolled,
            roll: rolls.talentsRoll,
            names: featName,
        },
        careerName,
        profile,
        xp: rules?.creation,
        shown: (key: string, final: string | number) =>
            reveal.rolling && !reveal.settled.has(key) && key in reveal.display
                ? (reveal.display[key] ?? final)
                : final,
        preview,
        stepErrors,
        identity: {
            values: identity,
            set: (patch: Partial<WfrpDraftIdentityInput>) =>
                setIdentity((prev) => ({ ...prev, ...patch })),
        },
        reveal,
        submit,
    };
}
