import { heroHpFallback } from './hero-hp';

import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

type MaxHp = RuleSystemDefinition['progression']['maxHp'];

export const heroMaxHp =
    (prev: MaxHp): MaxHp =>
    (input) =>
        input.entries?.some((e) => e.class)
            ? prev(input)
            : heroHpFallback(input.character, input.rules.heroScaling);
