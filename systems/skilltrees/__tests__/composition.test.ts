import { describe, expect, it } from 'vitest';

import { type Ruleset } from '@/lib/utils/rules';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { validateComposition } from '@/lib/utils/rules/systems/compose';

const MODULE = 'skilltrees';

const withModule = (modules: string[]): Ruleset => ({
    ...DEFAULT_RULES,
    system: { key: 'd20', modules },
});

const len = (value: readonly unknown[] | undefined) => value?.length ?? 0;

const on = () => ruleSystemOf(withModule([MODULE]));

const bare = () => ruleSystemOf(withModule([]));

describe('skilltrees module composition', () => {
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

    it('owns the personal skill column and adds no pure level reset', () => {
        expect(len(on().progression.levelResets)).toBe(
            len(bare().progression.levelResets)
        );
        expect(JSON.stringify(on().stats?.columns)).toContain(
            'personalSkillId'
        );
        expect(JSON.stringify(bare().stats?.columns ?? [])).not.toContain(
            'personalSkillId'
        );
    });
});
