import { useCallback, useMemo, useState } from 'react';

import type { CharacteristicKey } from '@/systems/wfrp/rules/characteristics/keys';
import {
    type CanonPicks,
    CAREER_SKILL_PURCHASES,
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

    const [speciesTalents, setSpeciesTalents] = useState<string[]>([]);

    const [bound, setBound] = useState<CareerBound>(EMPTY);

    const current = useMemo<CareerBound>(
        () => (bound.careerId === careerId ? bound : { ...EMPTY, careerId }),
        [bound, careerId]
    );

    const update = useCallback(
        (next: (cur: CareerBound) => Partial<CareerBound>) =>
            setBound((prev) => {
                const cur =
                    prev.careerId === careerId ? prev : { ...EMPTY, careerId };

                return { ...cur, ...next(cur), careerId };
            }),
        [careerId]
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

    const setSpeciesTalent = useCallback(
        (group: number, featId: string) =>
            setSpeciesTalents((prev) =>
                Object.assign([], prev, { [group]: featId })
            ),
        []
    );

    /** Functional steps: rapid clicks fired before a re-render must all count */
    const stepSkill = useCallback(
        (skill: string, delta: number, max: number) =>
            update(({ skills }) => {
                const own = skills[skill] ?? 0;

                const others =
                    Object.values(skills).reduce((a, b) => a + b, 0) - own;

                const ceiling = Math.min(
                    max,
                    SKILL_PURCHASE_CAP,
                    CAREER_SKILL_PURCHASES - others
                );

                return {
                    skills: {
                        ...skills,
                        [skill]: Math.max(0, Math.min(ceiling, own + delta)),
                    },
                };
            }),
        [update]
    );

    const stepBonus = useCallback(
        (key: CharacteristicKey, delta: number, cap: number) =>
            update(({ distribution }) => {
                const own = distribution[key] ?? 0;

                const others =
                    Object.values(distribution).reduce(
                        (a, b) => a + (b ?? 0),
                        0
                    ) - own;

                return {
                    distribution: {
                        ...distribution,
                        [key]: Math.max(0, Math.min(cap - others, own + delta)),
                    },
                };
            }),
        [update]
    );

    const picks = useMemo<CanonPicks>(
        () => ({
            speciesRolled,
            speciesSkills,
            speciesTalents,
            careerSkills: Object.fromEntries(
                Object.entries(current.skills).filter(([, n]) => n > 0)
            ),
            distribution: current.distribution,
            ...(current.talent && { careerTalent: current.talent }),
        }),
        [speciesRolled, speciesSkills, speciesTalents, current]
    );

    const reset = useCallback(() => {
        setSpeciesRolled(false);
        setSpeciesSkills([]);
        setSpeciesTalents([]);
        setBound(EMPTY);
    }, []);

    return {
        picks,
        speciesRolled,
        setSpeciesRolled,
        speciesSkills,
        toggleSpeciesSkill,
        speciesTalents,
        setSpeciesTalent,
        skills: current.skills,
        stepSkill,
        talent: current.talent,
        setTalent: (talent: string) => update(() => ({ talent })),
        distribution: current.distribution,
        stepBonus,
        reset,
    };
}
