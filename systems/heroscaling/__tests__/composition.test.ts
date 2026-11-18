import { describe, expect, it } from 'vitest';

import { type Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { validateComposition } from '@/lib/utils/rules/systems/compose';

const MODULE = 'heroscaling';

const withModule = (modules: string[]): Ruleset => ({
    ...DEFAULT_RULES,
    system: { key: 'd20', modules },
});

const len = (value: readonly unknown[] | undefined) => value?.length ?? 0;

const on = () => ruleSystemOf(withModule([MODULE]));

const bare = () => ruleSystemOf(withModule([]));

describe('heroscaling module composition', () => {
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

    it('adds the damage part, the hero participant parts and the archetype column', () => {
        expect(len(on().combat.damageParts)).toBe(
            len(bare().combat.damageParts) + 1
        );
        expect(len(on().participant?.fromCharacter)).toBe(
            len(bare().participant?.fromCharacter) + 2
        );
        expect(JSON.stringify(on().stats?.columns)).toContain('archetype');
    });

    it('wraps maxHp and claims progression.maxHp', () => {
        expect(on().progression.maxHp).not.toBe(bare().progression.maxHp);
    });
});
