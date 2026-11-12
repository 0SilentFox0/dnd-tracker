import { describe, expect, it } from 'vitest';

import { DEFAULT_RULES } from '@/lib/utils/rules';
import { parseRules } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';
import { heroHpFallback } from '@/systems/heroscaling/rules/hero-hp';
import { heroMaxHp } from '@/systems/heroscaling/rules/max-hp';
import type { ResolvedClassEntry } from '@/types/classes';

const character = { level: 4, constitution: 14, archetype: 'warrior' };

const withClass: ResolvedClassEntry[] = [
    {
        classId: 'c',
        level: 4,
        class: { hitDie: 8 } as ResolvedClassEntry['class'],
        subclass: null,
    },
];

const input = (entries: ResolvedClassEntry[] | null) => ({
    character,
    entries,
    characteristics: null,
    rules: DEFAULT_RULES,
});

describe('heroMaxHp', () => {
    const prev = () => ({ total: 99, breakdown: [] });

    it('with classes: defers to the base', () =>
        expect(heroMaxHp(prev)(input(withClass)).total).toBe(99));

    it('without classes: hero formula', () =>
        expect(heroMaxHp(prev)(input(null))).toEqual(
            heroHpFallback(character, DEFAULT_RULES.heroScaling)
        ));
});

describe('composition', () => {
    const hp = (rules: ReturnType<typeof parseRules>) =>
        ruleSystemOf(rules).progression.maxHp({
            ...input(null),
            rules,
        });

    it('homm: hero formula without classes', () => {
        const rules = parseRules({ system: { key: 'homm' } });

        expect(hp(rules).total).toBe(
            heroHpFallback(character, rules.heroScaling).total
        );
    });

    it('bare dnd5e: 1 without classes', () =>
        expect(hp(parseRules({ system: { key: 'dnd5e' } })).total).toBe(1));
});
