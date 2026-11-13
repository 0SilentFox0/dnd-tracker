import { describe, expect, it } from 'vitest';

import { DEFAULT_RULES } from '@/lib/utils/rules';
import {
    mergeRules,
    parseRules,
    RulesetPatchSchema,
} from '@/lib/utils/rules/schema';

const SYS = { system: { key: 'homm' } };

describe('rules.classes', () => {
    it('defaults to disabled', () => {
        expect(DEFAULT_RULES.classes).toEqual({ enabled: false });
        expect(parseRules(SYS).classes).toEqual({ enabled: false });
    });

    it('falls back to default on invalid section', () => {
        expect(
            parseRules({ ...SYS, classes: { enabled: 'yes' } }).classes
        ).toEqual({
            enabled: false,
        });
    });

    it('patches enabled', () => {
        const patch = RulesetPatchSchema.parse({ classes: { enabled: true } });

        const merged = mergeRules(DEFAULT_RULES, patch);

        expect(merged.ok && merged.rules.classes.enabled).toBe(true);
    });
});
