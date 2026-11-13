import { describe, expect, it } from 'vitest';

import { DEFAULT_RULES } from '@/lib/utils/rules';
import { parseRules, RulesetPatchSchema } from '@/lib/utils/rules/schema';

const SYS = { system: { key: 'homm' } };

describe('rules.criticals.doubleDice', () => {
    it('defaults to false', () => {
        expect(DEFAULT_RULES.criticals.doubleDice).toBe(false);
        expect(parseRules(SYS).criticals.doubleDice).toBe(false);
    });

    it('parses and patches', () => {
        expect(
            parseRules({ ...SYS, criticals: { doubleDice: true } }).criticals
                .doubleDice
        ).toBe(true);
        expect(
            RulesetPatchSchema.safeParse({ criticals: { doubleDice: true } })
                .success
        ).toBe(true);
    });
});
