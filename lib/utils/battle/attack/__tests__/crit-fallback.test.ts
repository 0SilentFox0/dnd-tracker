import { describe, expect, it, vi } from 'vitest';

import '@/lib/server/systems/registry';
import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { critRulesOf } from '@/lib/utils/battle/attack/crit-rules';
import { parseRules } from '@/lib/utils/rules/schema';
import * as systems from '@/lib/utils/rules/systems';

describe('critRulesOf', () => {
    it('has neutral effects without rules', () => {
        expect(critRulesOf(undefined).effects).toBe(false);
    });

    it('is neutral for a base without a crit hook (wfrp)', () => {
        expect(
            critRulesOf(parseRules({ system: { key: 'wfrp' } })).effects
        ).toBe(false);
    });

    it('is neutral for d6pool', () => {
        const spy = vi
            .spyOn(systems, 'ruleSystemOf')
            .mockReturnValue(D6POOL_SYSTEM);

        expect(
            critRulesOf(parseRules({ system: { key: 'dnd5e' } })).effects
        ).toBe(false);

        spy.mockRestore();
    });

    it('keeps the d20 hook: criticals.effects true stays true', () => {
        const rules = parseRules({
            system: { key: 'homm' },
            criticals: { effects: true },
        });

        expect(critRulesOf(rules).effects).toBe(true);
    });
});
