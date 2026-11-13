import { describe, expect, it } from 'vitest';

import { mergeRules, parseRules } from '@/lib/utils/rules/schema';

const SYS = { system: { key: 'homm' } };

describe('rules actions section', () => {
    it('defaults off', () => {
        expect(parseRules(SYS).actions).toEqual({
            enabled: false,
            opportunityAttacks: true,
            retaliation: true,
            variant: '2014',
        });
    });

    it('invalid variant falls back', () => {
        expect(
            parseRules({ ...SYS, actions: { variant: '1999' } }).actions.variant
        ).toBe('2014');
    });

    it('patch merges', () => {
        const r = mergeRules(parseRules(SYS), {
            actions: { enabled: true, variant: '2024' },
        });

        expect(r.ok && r.rules.actions).toEqual({
            enabled: true,
            opportunityAttacks: true,
            retaliation: true,
            variant: '2024',
        });
    });
});
