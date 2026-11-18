import {
    CAREER_TIER_COUNT,
    careerTierAliases,
    careerTierKey,
    ICON,
    NAME,
} from '../common';
import type { Pair, PerField } from '../types';

export const fieldAliases: PerField<readonly string[]> = {
    name: NAME,
    icon: ICON,
    class: ['клас', 'class', 'тип', 'type'],
    ...careerTierAliases(),
};

export const neutralExamples: PerField<Pair> = Object.fromEntries(
    Array.from({ length: CAREER_TIER_COUNT }, (_, i) => i + 1).flatMap((n) => [
        [careerTierKey(n, 'name'), [`Tier ${n}`, `Tier ${n}`]],
        [careerTierKey(n, 'characteristics'), ['ws', 'bs']],
        [careerTierKey(n, 'skills'), ['athletics, melee', 'perception']],
        [careerTierKey(n, 'trappings'), ['Sword; Shield', 'Dagger']],
    ])
);

export const ukExamples: PerField<Pair> = {
    name: ['Солдат', 'Шпигун'],
    class: ['Воїни', 'Мандрівники'],
};

export const enExamples: PerField<Pair> = {
    name: ['Soldier', 'Spy'],
    class: ['Warriors', 'Rangers'],
};
