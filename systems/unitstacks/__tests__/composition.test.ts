import { describe, expect, it } from 'vitest';

import { bareD20Rules } from '@/lib/__tests__/helpers/dnd5e-modules';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { validateComposition } from '@/lib/utils/rules/systems/compose';

const withStacks = (): Ruleset => ({
    ...DEFAULT_RULES,
    system: { key: 'd20', modules: ['unitstacks'] },
});

describe('unitstacks module composition', () => {
    it('is a valid add-on on d20', () =>
        expect(
            validateComposition({ key: 'd20', modules: ['unitstacks'] })
        ).toEqual([]));

    it('adds no hooks of its own: the combat definition matches bare d20', () => {
        const stacked = ruleSystemOf(withStacks()).combat;

        const bare = ruleSystemOf(bareD20Rules()).combat;

        expect(stacked.afterAttack ?? []).toHaveLength(
            bare.afterAttack?.length ?? 0
        );
        expect(stacked.turn?.onRoundStart ?? []).toHaveLength(
            bare.turn?.onRoundStart?.length ?? 0
        );
    });

    it('is rejected on a base that does not require d20', () =>
        expect(
            validateComposition({ key: 'wfrp', modules: ['unitstacks'] }).map(
                (i) => i.code
            )
        ).not.toEqual([]));
});
