import { describe, expect, it } from 'vitest';

import { type Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { validateComposition } from '@/lib/utils/rules/systems/compose';

const MODULE = 'morale';

const withModule = (modules: string[]): Ruleset => ({
    ...DEFAULT_RULES,
    system: { key: 'd20', modules },
});

const len = (value: readonly unknown[] | undefined) => value?.length ?? 0;

const on = () => ruleSystemOf(withModule([MODULE]));

const bare = () => ruleSystemOf(withModule([]));

describe('morale module composition', () => {
    it('is a valid add-on on d20', () =>
        expect(validateComposition({ key: 'd20', modules: [MODULE] })).toEqual(
            []
        ));

    it('is rejected on a base that does not require d20', () =>
        expect(
            validateComposition({ key: 'wfrp', modules: [MODULE] }).map(
                (i) => i.code
            )
        ).not.toEqual([]));

    it('adds the turn gates, the start check and the cap parts to d20', () => {
        expect(len(on().combat.turn?.actGates)).toBe(
            len(bare().combat.turn?.actGates) + 1
        );
        expect(len(on().combat.turn?.beforeAdvance)).toBe(
            len(bare().combat.turn?.beforeAdvance) + 1
        );
        expect(on().combat.turn?.startCheck).toBeDefined();
        expect(len(on().participant?.fromCharacter)).toBe(
            len(bare().participant?.fromCharacter) + 1
        );
        expect(len(on().participant?.fromUnit)).toBe(
            len(bare().participant?.fromUnit) + 1
        );
    });

    it('bare d20 has no start check', () =>
        expect(bare().combat.turn?.startCheck).toBeUndefined());
});
