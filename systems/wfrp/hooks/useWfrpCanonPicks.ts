import { useCallback, useMemo, useState } from 'react';

import type { CharacteristicKey } from '@/systems/wfrp/rules/characteristics/keys';
import {
    type CanonPicks,
    SKILL_PURCHASE_CAP,
} from '@/systems/wfrp/rules/creation';

type CareerBound = {
    careerId?: string;
    skills: Record<string, number>;
    talent?: string;
    distribution: Partial<Record<CharacteristicKey, number>>;
};

const EMPTY = { skills: {}, distribution: {} };

/** Canon5e creation picks; the career-bound ones reset when the career changes */
export function useWfrpCanonPicks(careerId: string | undefined) {
    const [speciesRolled, setSpeciesRolled] = useState(false);

    const [speciesSkills, setSpeciesSkills] = useState<string[]>([]);

    const [bound, setBound] = useState<CareerBound>(EMPTY);

    const current = useMemo<CareerBound>(
        () => (bound.careerId === careerId ? bound : { ...EMPTY, careerId }),
        [bound, careerId]
    );

    const patch = useCallback(
        (next: Partial<CareerBound>) =>
            setBound({ ...current, ...next, careerId }),
        [current, careerId]
    );

    const toggleSpeciesSkill = useCallback(
        (skill: string, count: number) =>
            setSpeciesSkills((prev) =>
                prev.includes(skill)
                    ? prev.filter((s) => s !== skill)
                    : prev.length < count
                      ? [...prev, skill]
                      : prev
            ),
        []
    );

    const setSkill = useCallback(
        (skill: string, n: number) =>
            patch({
                skills: {
                    ...current.skills,
                    [skill]: Math.max(0, Math.min(SKILL_PURCHASE_CAP, n)),
                },
            }),
        [patch, current.skills]
    );

    const setBonus = useCallback(
        (key: CharacteristicKey, n: number) =>
            patch({
                distribution: {
                    ...current.distribution,
                    [key]: Math.max(0, n),
                },
            }),
        [patch, current.distribution]
    );

    const picks = useMemo<CanonPicks>(
        () => ({
            speciesRolled,
            speciesSkills,
            careerSkills: Object.fromEntries(
                Object.entries(current.skills).filter(([, n]) => n > 0)
            ),
            distribution: current.distribution,
            ...(current.talent && { careerTalent: current.talent }),
        }),
        [speciesRolled, speciesSkills, current]
    );

    const reset = useCallback(() => {
        setSpeciesRolled(false);
        setSpeciesSkills([]);
        setBound(EMPTY);
    }, []);

    return {
        picks,
        speciesRolled,
        setSpeciesRolled,
        speciesSkills,
        toggleSpeciesSkill,
        skills: current.skills,
        setSkill,
        talent: current.talent,
        setTalent: (talent: string) => patch({ talent }),
        distribution: current.distribution,
        setBonus,
        reset,
    };
}
