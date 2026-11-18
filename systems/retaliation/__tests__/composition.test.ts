import { describe, expect, it } from 'vitest';

import {
    bareD20Rules,
    dnd5eRules,
} from '@/lib/__tests__/helpers/dnd5e-modules';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';

const withRetaliation = (): Ruleset => ({
    ...DEFAULT_RULES,
    system: { key: 'd20', modules: ['retaliation'] },
});

describe('retaliation module composition', () => {
    it('adds the after-attack and reset-state hooks', () => {
        const { combat } = ruleSystemOf(withRetaliation());

        expect(combat.afterAttack ?? []).toHaveLength(1);
        expect(combat.turn?.resetState ?? []).toHaveLength(1);
    });

    it('bare d20 carries neither hook', () => {
        const { combat } = ruleSystemOf(bareD20Rules());

        expect(combat.afterAttack ?? []).toHaveLength(0);
        expect(combat.turn?.resetState ?? []).toHaveLength(0);
    });

    it('stacks with the dnd5e preset modules without dropping their hooks', () => {
        const plain = ruleSystemOf(dnd5eRules()).combat;

        const stacked = ruleSystemOf({
            ...DEFAULT_RULES,
            system: {
                key: 'dnd5e',
                modules: [...(dnd5eRules().system.modules ?? []), 'retaliation'],
            },
        }).combat;

        expect(stacked.afterAttack?.length).toBe(
            (plain.afterAttack?.length ?? 0) + 1
        );
        expect(stacked.turn?.resetState?.length).toBe(
            (plain.turn?.resetState?.length ?? 0) + 1
        );
    });
});
