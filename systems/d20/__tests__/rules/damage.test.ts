import { describe, expect, it } from 'vitest';

import { d20Damage } from '../../rules/damage';

import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { parseRules } from '@/lib/utils/rules/schema';

describe('d20Damage', () => {
    const on = parseRules({ criticals: { doubleDice: true } });

    it('doubles dice only on a crit with the rule on', () => {
        expect(d20Damage({ rules: on, crit: true }).doubleDice).toBe(true);
        expect(d20Damage({ rules: on, crit: false }).doubleDice).toBe(false);
        expect(d20Damage({ rules: DEFAULT_RULES, crit: true }).doubleDice).toBe(
            false
        );
    });

    it('has no mitigation of its own', () => {
        expect(d20Damage({ rules: on, crit: true }).mitigated).toBeUndefined();
    });
});
