import { useCallback, useMemo, useState } from 'react';

import {
    type CareerMode,
    STAT_COUNT,
    type StatsMode,
} from './draft-form-helpers';

import type {
    CreationPicks,
    CreationRolls,
} from '@/systems/wfrp/rules/creation';

export function useWfrpDraftPicks() {
    const [speciesId, setSpeciesId] = useState<string>();

    const [careerMode, setCareerModeState] = useState<CareerMode>('rolled');

    const [careerId, setCareerId] = useState<string>();

    const [careerRolls, setCareerRolls] = useState<
        CreationRolls['careerRolls']
    >([]);

    const [statsMode, setStatsMode] = useState<StatsMode>('rolled');

    const [statRolls, setStatRolls] = useState<number[]>([]);

    const [arranged, setArranged] = useState<number[]>([]);

    const [points, setPoints] = useState<number[]>(() =>
        Array.from({ length: STAT_COUNT }, () => 10)
    );

    const [rolledTalents, setRolledTalents] = useState<string[]>([]);

    const picks = useMemo<CreationPicks>(
        () => ({
            career: { mode: careerMode, careerId: careerId ?? '' },
            stats:
                statsMode === 'free'
                    ? { mode: 'free', points }
                    : statsMode === 'rearranged'
                      ? { mode: 'rearranged', rolls: statRolls, arranged }
                      : { mode: 'rolled', rolls: statRolls },
            talents: rolledTalents,
        }),
        [
            careerMode,
            careerId,
            statsMode,
            points,
            statRolls,
            arranged,
            rolledTalents,
        ]
    );

    const selectSpecies = useCallback(
        (raceId: string) => {
            if (raceId === speciesId) return;

            setSpeciesId(raceId);
            setCareerId(undefined);
            setCareerRolls([]);
            setStatRolls([]);
            setArranged([]);
            setRolledTalents([]);
        },
        [speciesId]
    );

    const setCareerMode = useCallback(
        (mode: CareerMode) => {
            setCareerModeState(mode);
            setCareerId((prev) =>
                mode === 'rolled'
                    ? careerRolls[0]?.careerId
                    : mode === 'choice'
                      ? careerRolls.some((r) => r.careerId === prev)
                          ? prev
                          : undefined
                      : prev
            );
        },
        [careerRolls]
    );

    const swap = useCallback(
        (i: number, j: number) =>
            setArranged((prev) =>
                prev.map((v, k) => (k === i ? prev[j] : k === j ? prev[i] : v))
            ),
        []
    );

    const setPoint = useCallback(
        (i: number, v: number) =>
            setPoints((prev) => prev.map((p, k) => (k === i ? v : p))),
        []
    );

    return {
        picks,
        speciesId,
        selectSpecies,
        career: {
            mode: careerMode,
            setMode: setCareerMode,
            id: careerId,
            setId: setCareerId,
            rolls: careerRolls,
            setRolls: setCareerRolls,
        },
        stats: {
            mode: statsMode,
            setMode: setStatsMode,
            rolls: statRolls,
            setRolls: setStatRolls,
            arranged,
            setArranged,
            points,
            swap,
            setPoint,
        },
        talents: { rolled: rolledTalents, set: setRolledTalents },
    };
}
