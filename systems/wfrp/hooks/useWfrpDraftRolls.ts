import { useCallback } from 'react';

import type { CareerMode } from './draft-form-helpers';

import type { useRollReveal } from '@/lib/hooks/characters';
import type { Rng } from '@/lib/utils/common/rng';
import {
    type CreationRolls,
    rollCreation,
    type SpeciesProfile,
} from '@/systems/wfrp/rules/creation';

type Reveal = ReturnType<typeof useRollReveal<string>>;

export interface WfrpDraftRollsOptions {
    rng: Rng;
    reveal: Reveal;
    profile?: SpeciesProfile;
    enabled: boolean;
    names: { career(id: string): string; feat(id: string): string };
    career: {
        mode: CareerMode;
        rolls: CreationRolls['careerRolls'];
        setRolls(rolls: CreationRolls['careerRolls']): void;
        setId(id: string | undefined): void;
    };
    stats: {
        rolls: number[];
        setRolls(rolls: number[]): void;
        setArranged(rolls: number[]): void;
    };
    talents: { rolled: string[]; set(ids: string[]): void };
}

export function useWfrpDraftRolls({
    rng,
    reveal,
    profile,
    enabled,
    names,
    career,
    stats,
    talents,
}: WfrpDraftRollsOptions) {
    const careerName = names.career;

    const featName = names.feat;

    const setCareerRolls = career.setRolls;

    const setCareerId = career.setId;

    const setStatRolls = stats.setRolls;

    const setArranged = stats.setArranged;

    const setRolledTalents = talents.set;

    const careerMode = career.mode;

    const rollAll = useCallback(
        () => (profile && enabled ? rollCreation(rng, profile) : undefined),
        [enabled, profile, rng]
    );

    const rollCareer = useCallback(() => {
        if (career.rolls.length) return;

        const rolled = rollAll();

        if (!rolled) return;

        setCareerRolls(rolled.careerRolls);
        setCareerId(
            careerMode === 'rolled'
                ? rolled.careerRolls[0]?.careerId
                : undefined
        );
        reveal.start(
            rolled.careerRolls.map((r, i) => ({
                key: `career${i}`,
                pool: () =>
                    careerName(
                        (
                            profile?.careerTable[
                                Math.floor(rng() * profile.careerTable.length)
                            ] ?? r
                        ).careerId
                    ),
                final: careerName(r.careerId),
            }))
        );
    }, [
        career.rolls.length,
        setCareerRolls,
        setCareerId,
        careerMode,
        rollAll,
        reveal,
        careerName,
        profile,
        rng,
    ]);

    const rollStats = useCallback(() => {
        if (stats.rolls.length) return;

        const rolled = rollAll();

        if (!rolled) return;

        setStatRolls(rolled.statRolls);
        setArranged(rolled.statRolls);
        reveal.start(
            rolled.statRolls.map((v, i) => ({
                key: `stat${i}`,
                pool: () => 2 + Math.floor(rng() * 19),
                final: v,
            }))
        );
    }, [stats.rolls.length, setStatRolls, setArranged, rollAll, reveal, rng]);

    const rollTalents = useCallback(() => {
        if (talents.rolled.length) return;

        const rolled = rollAll();

        if (!rolled) return;

        setRolledTalents(rolled.randomTalents);
        reveal.start(
            rolled.randomTalents.map((f, i) => ({
                key: `talent${i}`,
                pool: () =>
                    featName(
                        (
                            profile?.randomTalents[
                                Math.floor(rng() * profile.randomTalents.length)
                            ] ?? { featId: f }
                        ).featId
                    ),
                final: featName(f),
            }))
        );
    }, [
        talents.rolled.length,
        setRolledTalents,
        rollAll,
        reveal,
        featName,
        profile,
        rng,
    ]);

    return {
        careerRoll: rollCareer,
        statsRoll: rollStats,
        talentsRoll: rollTalents,
    };
}
